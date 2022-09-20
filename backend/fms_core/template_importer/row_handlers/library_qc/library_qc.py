from decimal import Decimal
from fms_core.models.sample import Sample
from fms_core.services.sample import update_qc_flags
from fms_core.models.instrument_type import InstrumentType
from fms_core.services.sample import update_sample, get_sample_from_container
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.property_value import create_process_measurement_properties
from fms_core.services.library import update_library, convert_library_concentration_from_nm_to_ngbyul
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

INSTRUMENT_PROPERTIES = ['Quality Instrument', 'Quantity Instrument']
QC_PLATFORM = "Quality Control"

class LibraryQCRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample_container, measures, process, process_measurement, process_measurement_properties):

        barcode = sample_container['container_barcode']
        coordinates = sample_container['container_coord']

        source_sample_obj, self.errors['container'], self.warnings['container'] = \
                    get_sample_from_container(barcode=barcode, coordinates=coordinates)

        # If library sample cannot be found then bail.
        if source_sample_obj is None:
            self.errors['library'] = f"Library sample for QC was not found in container ({barcode}) at ({coordinates})"
            return

        if not source_sample_obj.is_library:
            self.errors['sample'] = f'The sample {source_sample_obj.name} at {barcode}@{coordinates} is not a library or a pool of libraries. '

        # volumes
        initial_volume = measures['initial_volume']
        measured_volume = measures['measured_volume']
        volume_used = process_measurement['volume_used']
        sample_volume = source_sample_obj.volume
        final_volume = None
        
        if initial_volume is None:
            self.errors['initial_volume'] = 'Initial volume must be specified'
        if measured_volume is None:
            self.errors['measured_volume'] = 'Measured volume must be specified'
        if volume_used is None:
            self.errors['volume_used'] = 'Volume used must be specified'
        if sample_volume is None:
            self.errors['library volume'] = 'Library volume is missing'

        if not any(self.errors.values()):
            if initial_volume < 0:
                self.errors['initial_volume'] = f"Initial volume ({initial_volume}) must be a positive value."

            if measured_volume < 0:
                self.errors['measured_volume'] = f'Measured volume ({measured_volume}) must be a positive value.'
            elif measured_volume > initial_volume:
                self.warnings['measured_volume'] = f"Measured volume {measured_volume} is greater than initial volume {initial_volume}"

            if volume_used < 0:
                self.errors['volume_used'] = f'Volume used ({volume_used}) must be a positive value.'
            if volume_used > measured_volume:
                self.errors['volume_used'] = f'Volume used ({volume_used}) is greater than measured volume ({measured_volume})'

            delta_volume = measured_volume - initial_volume
            final_volume = sample_volume + delta_volume - volume_used

            change_in_initial_volume = abs(initial_volume - sample_volume)
            if (change_in_initial_volume) > 0.0:
                self.warnings['initial_volume'] = f"The current library volume ({sample_volume}uL) differs from the initial volume ({initial_volume}uL) in the template. The library volume will be set to {final_volume}uL."

            if final_volume < 0:
                self.errors['library_volume'] = f'The library\'s computed final volume would be less than zero ({final_volume}). Please verify the volume currently stored for the library.'

        # library size
        library_size = measures['library_size']
        # If it is a pool of libraries that was previously QC'cd then we skip the updating (if none of the libraries have library size it was not QC'ed)
        if not source_sample_obj.is_pool or all([derived_sample.library and derived_sample.library.library_size is None for derived_sample in source_sample_obj.derived_samples.all()]):
            if library_size is None:
                self.errors['library_size'] = 'Library size must be specified'
            else:
                # Set the library size on the library
                # Send all the derived samples related to the sample source
                for derived_sample in source_sample_obj.derived_samples.all():
                    _, self.errors['library-size'], self.warnings['library-size'] = \
                        update_library(derived_sample, **{'library_size': library_size})

        # concentration
        if measures['concentration_nm'] is None and measures['concentration_uL'] is None:
            self.errors['concentration'] = 'A concentration in either nM or ng/uL must be specified.'

        if measures['concentration_nm'] is not None and measures['concentration_uL'] is not None:
            self.errors['concentration'] = 'Concentration must be specified in either nM or ng/uL, not both.'

        concentration = measures['concentration_uL']
        if concentration is None:
            concentration = measures['concentration_nm']
            if concentration is not None:
                # Calculate the concentration taking into account volume ratios
                concentration, self.errors['concentration_conversion'], self.warnings['concentration_conversion'] = \
                    convert_library_concentration_from_nm_to_ngbyul(source_sample_obj, measures['concentration_nm'])
                if concentration is None:
                    self.errors['concentration'] = 'Concentration could not be converted from nM to ng/uL'
        
        # Round concentration to 3 decimal places
        if concentration is not None:
            concentration = round(concentration, 3)
       
        # Set the process measurement properties
        process_measurement_properties['Measured Volume']['value'] = measured_volume
        process_measurement_properties['Concentration']['value'] = concentration
        process_measurement_properties['Library Size']['value'] = library_size
        process_measurement_properties['Library Quality QC Flag']['value'] = measures['quality_flag']
        process_measurement_properties['Quality Instrument']['value'] = measures['quality_instrument']
        process_measurement_properties['Library Quantity QC Flag']['value'] = measures['quantity_flag']
        process_measurement_properties['Quantity Instrument']['value'] = measures['quantity_instrument']
        
         # Validate instruments according to platform
        for instrument in INSTRUMENT_PROPERTIES:
            type = process_measurement_properties[instrument]['value']
            try:
                it = InstrumentType.objects.get(type=type)
                # Validate platform and type
                if it.platform.name != QC_PLATFORM:
                    self.errors['instrument_type'] = f'Invalid type: ({it.platform}) for instrument: {it.type}.'
            except Exception as e:
                self.errors['instrument'] = f'Invalid instrument ({type}) for {instrument}.'

        # Return if there are any validation errors
        if any(self.errors.values()):
            return

        # update the sample volume and concentration
        _, self.errors['sample_update'], self.warnings['sample_update'] = \
            update_sample(sample_to_update=source_sample_obj,
                            volume=final_volume,
                            concentration=concentration)

        _, self.errors['flags'], self.warnings['flags'] = \
            update_qc_flags(sample=source_sample_obj,
                            quantity_flag=measures['quantity_flag'],
                            quality_flag=measures['quality_flag'])
            
        # library qc flags are stored as process measurements
        process_measurement_obj, self.errors['process_measurement'], self.warnings['process_measurement'] = \
            create_process_measurement(
                process=process,
                source_sample=source_sample_obj,
                execution_date=process_measurement['execution_date'],
                volume_used=process_measurement['volume_used'],
                comment=process_measurement['comment'],
            )

         # Create process measurement's properties
        if process_measurement_obj:
            properties_obj, self.errors['properties'], self.warnings['properties'] = create_process_measurement_properties(
                process_measurement_properties,
                process_measurement_obj)

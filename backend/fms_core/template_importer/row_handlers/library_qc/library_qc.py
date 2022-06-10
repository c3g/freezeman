from fms_core.services.sample import update_qc_flags
from fms_core.models.instrument_type import InstrumentType
from fms_core.utils import convert_concentration_from_nm_to_ngbyul
from fms_core.services.sample import update_sample, get_sample_from_container
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.property_value import create_process_measurement_properties
from fms_core.services.library import set_library_size
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

INSTRUMENT_PROPERTIES = ['Quality Instrument', 'Quantity Instrument']
QC_PLATFORM = "Quality Control"

class LibraryQCRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample_container, measures, process, process_measurement, process_measurement_properties):
         # Get the library sample that was checked
        source_sample_obj, self.errors['container'], self.warnings['container'] = \
            get_sample_from_container(barcode=sample_container['container_barcode'], coordinates=sample_container['container_coord'])

        if source_sample_obj is None:
            self.errors['sample_source'] = f"Library sample for QC was not found in container {sample_container['container_barcode']} at {sample_container['coordinates']}."

        if not source_sample_obj.is_library:
            self.errors['sample_source'] = f'The sample at the specified location is not a library: ${source_sample_obj.name}'

        # volumes
        if measures['initial_volume'] is None:
            self.errors['initial_volume'] = 'Initial volume must be specified.'
        else:
            change_in_volume = abs(measures['initial_volume'] - source_sample_obj.volume)
            if (change_in_volume) > 0.0:
                self.warnings['initial volume'] = f"The current library volume {source_sample_obj.volume }uL differs from the initial volume {measures['initial_volume']}uL"
            
        if measures['measured_volume'] is None:
            self.errors['measured_volume'] = 'Measured volume must be specified.'
        if measures['measured_volume'] < 0:
            self.errors['measured_volume'] = f'Measured volume must be a positive value.'

        if process_measurement['volume_used'] is None:
            self.errors['volume_used'] = 'Volume used must be specified.'
        if process_measurement['volume_used'] < 0:
            self.errors['volume_used'] = 'Volume used must be a positive value.'

        delta_volume = measures['measured_volume'] - measures['initial_volume']
        final_volume = source_sample_obj.volume + delta_volume - process_measurement['volume_used']

        change_in_initial_volume = abs(measures['initial_volume'] - source_sample_obj.volume)
        if (change_in_initial_volume) > 0.0:
            self.warnings['initial volume'] = f"The current library volume ({source_sample_obj.volume }uL) differs from the initial volume ({measures['initial_volume']}uL) in the template. The library volume will be set to {final_volume}uL."

        # library size
        library_size = measures['library_size']
        if library_size is None:
            self.errors['library_size'] = 'Library size must be specified'

        # concentration
        if measures['concentration_nm'] is None and measures['concentration_uL'] is None:
            self.errors['concentration'] = 'A concentration in either nM or ng/uL must be specified.'

        if measures['concentration_nm'] is not None and measures['concentration_uL'] is not None:
            self.errors['concentration'] = 'Concentration must be specified in either nM or ng/uL, not both.'

        concentration = measures['concentration_uL']
        if concentration is None:
            concentration = measures['concentration_nm']
            if concentration is not None:
                molecular_weight = source_sample_obj.derived_sample_not_pool.library.molecular_weight_approx
                concentration = convert_concentration_from_nm_to_ngbyul(concentration, molecular_weight, library_size)
                if concentration is None:
                    self.errors['concentration'] = 'Concentration could not be converted from nM to ng/uL'
       
        # Set the process measurement properties
        process_measurement_properties['Concentration']['value'] = concentration
        process_measurement_properties['Library Size'] = library_size
        process_measurement_properties['Measured Volume']['value'] = measures['measured_volume']
        process_measurement_properties['Quality Instrument']['value'] = measures['quality_instrument']
        process_measurement_properties['Sample Quality QC Flag']['value'] = measures['quality_flag']
        process_measurement_properties['Quantity Instrument']['value'] = measures['quantity_instrument']
        process_measurement_properties['Sample Quantity QC Flag']['value'] = measures['quantity_flag']
       
         # Validate instruments according to platform
        for instrument in INSTRUMENT_PROPERTIES:
            type = process_measurement_properties[instrument]['value']
            try:
                it = InstrumentType.objects.get(type=type)
                # Validate platform and type
                if it.platform.name != QC_PLATFORM:
                    self.errors['instrument_type'] = f'Invalid type: {it.platform} for instrument: {it.type}.'
            except Exception as e:
                self.errors['instrument'] = f'Invalid instrument {type} for {instrument}.'

        # Return if there are any validation errors
        if self.errors:
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

        # set the library size on the library
        _, self.errors['library-size'], self.warnings['library-size'] = \
           set_library_size(source_sample_obj, library_size)
            
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



        
        
        

        




        


        
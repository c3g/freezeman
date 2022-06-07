


from fms_core.models.instrument_type import InstrumentType
from fms_core.utils import convert_concentration_from_nm_to_ngbyul
from fms_core.services.sample import update_sample, get_sample_from_container
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.property_value import create_process_measurement_properties
from fms_core.services.library import set_library_size
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

INSTRUMENT_PROPERTIES = ['Library Quality Instrument', 'Library Quantity Instrument']
QC_PLATFORM = "Quality Control"

class LibraryQCRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample_container, measures, process, process_measurement, process_measurement_properties):
         # Get the library sample that was checked
        source_sample_obj, self.errors['container'], self.warnings['container'] = \
            get_sample_from_container(barcode=sample_container['container_barcode'], coordinates=sample_container['container_coord'])

        if source_sample_obj is None:
            self.errors['sample_source'] = 'Library sample for QC was not found at the specified container.'

        if not source_sample_obj.is_library:
            self.errors['sample_source'] = f'The sample at the specified location is not a library: ${source_sample_obj.name}, id: ${source_sample_obj.id}'

        # volume
        if measures['initial_volume'] is None and measures['measured_volume'] is None:
            self.errors['measured_volume'] = 'Either measured or initial volume must be specified.'

        if measures['volume_used'] is None:
            self.errors['volume_used'] = 'Volume used must be specified.'

        if measures['volume_used'] < 0:
            self.errors['Volume used should be a positive number.']

        final_volume = measures['measured_volume'] if measures['measured_volume'] is not None else measures['initial_volume']
        final_volume -= measures['volume_used']

        # concentration
        if measures['concentration_nm'] is not None and measures['concentration_uL'] is not None:
            self.warning['concentration'] = 'The concentration should be specified in nM or uL, not both. nM will be ignored.'


        library_size = measures['library_size']
        if library_size is None:
            self.errors['library_size'] = 'Library size must be specified'

        concentration = measures['concentration_uL']
        if concentration is None:
            concentration = measures['concentration_nm']
            if concentration is None:
                self.errors['concentration'] = 'A concentration in either nM or uL must be specified.'
            else:
                molecular_weight = source_sample_obj.derived_sample_not_pool.library.molecular_weight_approx
                concentration = convert_concentration_from_nm_to_ngbyul(concentration, molecular_weight, library_size)
                if concentration is None:
                    self.errors['concentration'] = 'Concentration could not be converted from nM to ng/uL'
                else:
                    process_measurement_properties["Library Concentration"]['value'] = concentration

        # update the sample volume and concentration
        _, self.errors['sample_update'], self.warnings['sample_update'] = \
            update_sample(sample_to_update=source_sample_obj,
                            volume=final_volume,
                            concentration=concentration)

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

        if process_measurement_obj and properties_obj:
            # Validate instruments according to platform
            for instrument in INSTRUMENT_PROPERTIES:
                type = process_measurement_properties[instrument]['value']
                try:
                    it = InstrumentType.objects.get(type=type)
                    # Validate platform and type
                    if it.platform.name != QC_PLATFORM:
                        self.errors['instrument_type'] = f'Invalid type: {it.platform} for instrument: {it.type}.'
                except Exception as e:
                    self.errors['instrument'] = f'Invalid instrument {type}.'


        
        
        

        




        


        
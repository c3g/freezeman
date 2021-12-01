from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container, update_sample
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.property_value import create_process_measurement_properties
from fms_core.services.derived_sample import update_qc_flags
from fms_core.models import InstrumentType

INSTRUMENT_PROPERTIES = ['Electrophoresis Instrument', 'Quantitation Instrument']
TYPES_BY_PLATFORM = {
    'PicoGreen': 'Quality Control: Quantitation',
    'Qubit': 'Quality Control: Quantitation',
    'Agarose Gel': 'Quality Control: Electrophoresis',
    'TapeStation': 'Quality Control: Electrophoresis',
}


class SampleQCRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample, sample_information, process_measurement, process_measurement_properties):
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=sample['container']['barcode'],
            coordinates=sample['coordinates'],
        )

        if sample_obj:
            # Update sample with sample_information
            new_volume = None
            if all([sample_information['initial_volume'], sample_information['measured_volume'],
                    process_measurement['volume_used']]):
                delta_volume = sample_information['measured_volume'] - sample_information['initial_volume']
                new_volume = sample_obj.volume + delta_volume - process_measurement['volume_used']
            else:
                self.errors['volume'] = 'Initial Volume, Measured Volume and Volume Used are required.'

            if not sample_information['concentration']:
                self.errors['concentration'] = 'Concentration is required'

            _, self.errors['sample_update'], self.warnings['sample_update'] = \
                update_sample(sample_to_update=sample_obj,
                              volume=new_volume,
                              concentration=sample_information['concentration'])

            # Update derived_sample's flags with sample information
            _, self.errors['flags'], self.warnings['flags'] = update_qc_flags(sample_obj,
                                                                              sample_information['quantity_flag'],
                                                                              sample_information['quality_flag'])

            process_measurement_obj, self.errors['process_measurement'], self.warnings['process_measurement'] = \
                create_process_measurement(
                    process=process_measurement['process'],
                    source_sample=sample_obj,
                    execution_date=process_measurement['execution_date'],
                    volume_used=process_measurement['volume_used'],
                    comment=process_measurement['comment'],
                )

            # Validate instruments according to platform
            for instrument in INSTRUMENT_PROPERTIES:
                try:
                    type = process_measurement_properties[instrument]['value']
                    it = InstrumentType.objects.get(type=type)
                    # Validate platform and type
                    if it.platform != TYPES_BY_PLATFORM[it.name]:
                        self.errors['properties'] = f'Invalid type: {it.platform} for instrument: {it.name}.'
                except Exception:
                    self.errors['properties'] = f'Invalid instrument {type}.'

            # TODO: Validate required RIN for RNA
            _, self.errors['properties'], properties_warnings = create_process_measurement_properties(
                process_measurement_properties,
                process_measurement_obj)

from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container, update_sample
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.property_value import create_process_measurement_properties

from fms_core.utils import check_truth_like

class SampleSelectionQPCRRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample, process_measurement, process_measurement_properties):
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=sample['container']['barcode'],
            coordinates=sample['coordinates'],
        )

        if sample_obj:
            if not process_measurement['volume_used']:
                self.errors['volume used'] = 'Volume used is required.'
            else:
                process_measurement_obj, self.errors['process_measurement'], self.warnings['process_measurement'] = \
                    create_process_measurement(
                        process=process_measurement['process'],
                        source_sample=sample_obj,
                        execution_date=process_measurement['execution_date'],
                        volume_used=process_measurement['volume_used'],
                        comment=process_measurement['comment'],
                    )

                # Create process measurement's properties
                if process_measurement_obj:
                    properties_obj, self.errors['properties'], self.warnings['properties'] = create_process_measurement_properties(
                        process_measurement_properties,
                        process_measurement_obj)

                    # Update sample with Depleted and volume new values
                    depleted = check_truth_like(sample['depleted']) if sample['depleted'] and check_truth_like(sample['depleted']) else None
                    new_volume = sample_obj.volume - process_measurement['volume_used']
                    
                    _, self.errors['sample_update'], self.warnings['sample_update'] = \
                        update_sample(sample_to_update=sample_obj, volume=new_volume, depleted=depleted)

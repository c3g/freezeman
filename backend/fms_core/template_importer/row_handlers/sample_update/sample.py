from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container, update_sample
from fms_core.services.process_measurement import create_process_measurement

class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, sample, sample_updated, process_measurement):
        print('start sample row handler')

        comment = f"Automatically generated via Sample update Template on {datetime.utcnow().isoformat()}Z"

        sample_to_update, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=sample['container']['barcode'],
            coordinates=sample['coordinates'],
        )

        if sample_to_update:
            update_sample(
                sample_to_update=sample_to_update,
                volume=sample_updated['volume'],
                concentration=sample_updated['concentration'],
                depleted=sample_updated['depleted']
            )

            _, self.errors['process_measurement'], self.warnings['process_measurement'] = \
                create_process_measurement(
                    process=process_measurement['process'],
                    source_sample=sample_to_update,
                    execution_date=process_measurement['execution_date'],
                    volume_used=process_measurement['volume_used'],
                    comment=process_measurement['comment'],
                )


        print('sample_update/sample row handler ERRORS: ', self.errors)
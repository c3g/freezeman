from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container, update_sample
from fms_core.services.process_measurement import create_process_measurement

class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, delta_volume, sample, sample_updated, process_measurement):
        print('start sample row handler')

        sample_to_update, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=sample['container']['barcode'],
            coordinates=sample['coordinates'],
        )

        if sample_to_update:
            depleted = None
            if sample_updated['depleted'] == 'YES':
                depleted = True
            elif sample_updated['depleted'] == 'NO':
                depleted = False

            volume_used = None
            new_volume = None
            if sample_updated['volume']:
                volume_used = sample_to_update.volume - sample_updated['volume']
                new_volume = sample_updated['volume']
                if delta_volume and delta_volume != volume_used:
                    self.errors['update_volume'] = f"Delta volume and New volume are both present and do not match."
            elif delta_volume:
                volume_used = delta_volume
                new_volume = sample_to_update.volume - delta_volume

            _, self.errors['sample_update'], self.warnings['sample_update'] = update_sample(
                sample_to_update=sample_to_update,
                volume=new_volume,
                concentration=sample_updated['concentration'],
                depleted=depleted,
            )

            print('sample update sample row handler', sample_to_update.__dict__)

            _, self.errors['process_measurement'], self.warnings['process_measurement'] = \
                create_process_measurement(
                    process=process_measurement['process'],
                    source_sample=sample_to_update,
                    execution_date=process_measurement['execution_date'],
                    volume_used=volume_used,
                    comment=process_measurement['comment'],
                )


        print('sample_update/sample row handler ERRORS: ', self.errors)
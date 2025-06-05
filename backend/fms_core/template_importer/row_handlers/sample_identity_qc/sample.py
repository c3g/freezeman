from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.services.container import get_or_create_container
from fms_core.services.sample import get_sample_from_container, transfer_sample

class SampleIdentityQCRowHandler(GenericRowHandler):

    def process_row_inner(self, source_sample, resulting_sample, process_measurement, workflow):
        original_sample, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(barcode=source_sample['container']['barcode'],
                                                                                                    coordinates=source_sample['coordinates'])

        destination_container_dict = resulting_sample['container']

        if original_sample:
            destination_container, _, self.errors['container'], self.warnings['container'] = get_or_create_container(
                barcode=destination_container_dict['barcode'],
                kind=destination_container_dict['kind'],
                name=destination_container_dict['name'])

            _, self.errors['transfered_sample'], self.warnings['transfered_sample'] = transfer_sample(process=process_measurement['process'],
                                                                                                      sample_source=original_sample,
                                                                                                      container_destination=destination_container,
                                                                                                      volume_used=process_measurement['volume_used'],
                                                                                                      execution_date=process_measurement['execution_date'],
                                                                                                      coordinates_destination=resulting_sample['coordinates'],
                                                                                                      volume_destination=resulting_sample['volume'],
                                                                                                      comment=process_measurement['comment'],
                                                                                                      workflow=workflow)

            # Add a mechanism to hold the sample until results are submitted

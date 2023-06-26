from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.sample import get_sample_from_container, transfer_sample

from fms_core.utils import check_truth_like

class TransferRowHandler(GenericRowHandler):

    def process_row_inner(self, source_sample, resulting_sample, process_measurement, workflow):
        original_sample, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(barcode=source_sample['container']['barcode'],
                                                                                                    coordinates=source_sample['coordinates'])
        self.warnings['sample'] = [(x, []) for x in self.warnings['sample']]
        
        destination_container_dict = resulting_sample['container']

        parent_barcode = destination_container_dict['parent_barcode']
        if parent_barcode:
            container_parent, self.errors['parent_container'], self.warnings['parent_container'] = get_container(barcode=parent_barcode)
            self.warnings['parent_container'] = [(x, []) for x in self.warnings['parent_container']]
        else:
            container_parent = None

        if original_sample and ((parent_barcode and container_parent) or not parent_barcode):
            destination_container, _, self.errors['container'], self.warnings['container'] = get_or_create_container(
                barcode=destination_container_dict['barcode'],
                kind=destination_container_dict['kind'],
                name=destination_container_dict['name'],
                coordinates=destination_container_dict['coordinates'],
                container_parent=container_parent)
            self.warnings['container'] = [(x, []) for x in self.warnings['container']]

            source_depleted = check_truth_like(source_sample['depleted']) if source_sample['depleted'] else None

            _, self.errors['transfered_sample'], self.warnings['transfered_sample'] = transfer_sample(process=process_measurement['process'],
                                                                                                      sample_source=original_sample,
                                                                                                      container_destination=destination_container,
                                                                                                      volume_used=process_measurement['volume_used'],
                                                                                                      execution_date=process_measurement['execution_date'],
                                                                                                      coordinates_destination=resulting_sample['coordinates'],
                                                                                                      volume_destination=resulting_sample['volume'],
                                                                                                      source_depleted=source_depleted,
                                                                                                      comment=process_measurement['comment'],
                                                                                                      workflow=workflow)
            self.warnings['transfered_sample'] = [(x, []) for x in self.warnings['transfered_sample']]


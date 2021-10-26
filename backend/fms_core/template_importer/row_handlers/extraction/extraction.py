from fms_core.models import Sample
from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.services.sample import get_sample_from_container, transfer_sample
from fms_core.services.container import get_or_create_container, get_container

from fms_core.utils import check_truth_like

class ExtractionRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, source_sample, resulting_sample, process_measurement):
        original_sample, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(barcode=source_sample['container']['barcode'],
                                                                                                    coordinates=source_sample['coordinates'])

        destination_container_dict = resulting_sample['container']

        parent_barcode = destination_container_dict['parent_barcode']
        if parent_barcode:
            container_parent, self.errors['parent_container'], self.warnings['parent_container'] = get_container(barcode=parent_barcode)
        else:
            container_parent = None

        destination_container, _, self.errors['container'], self.warnings['container'] = get_or_create_container(barcode=destination_container_dict['barcode'],
                                                                                                                 kind=destination_container_dict['kind'].lower(),
                                                                                                                 name=destination_container_dict['name'],
                                                                                                                 coordinates=destination_container_dict['coordinates'],
                                                                                                                 container_parent=container_parent)

        source_depleted = check_truth_like(source_sample['depleted']) if source_sample['depleted'] else None

        # Initialize the destination sample to set extraction specific informations in order to pass validation
        sample_destination = Sample.objects.get(id=original_sample.id)
        sample_destination.pk = None
        sample_destination.concentration = resulting_sample['concentration']
        sample_destination.sample_kind = resulting_sample['kind']
        sample_destination.tissue_source = Sample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE.get(original_sample.sample_kind.name, "")

        _, self.errors['extracted_sample'], self.warnings['extracted_sample'] = transfer_sample(process=process_measurement['process'],
                                                                                                               sample_source=original_sample,
                                                                                                               container_destination=destination_container,
                                                                                                               volume_used=process_measurement['volume_used'],
                                                                                                               date_execution=process_measurement['execution_date'],
                                                                                                               sample_destination=sample_destination,
                                                                                                               coordinates_destination=resulting_sample['coordinates'],
                                                                                                               volume_destination=resulting_sample['volume'],
                                                                                                               source_depleted=source_depleted)


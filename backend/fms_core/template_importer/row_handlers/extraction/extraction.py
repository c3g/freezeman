from datetime import datetime
from fms_core.models import Sample
from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.services.sample import get_sample_from_container, create_sample
from fms_core.services.container import get_or_create_container, get_container
from fms_core.services.process_measurement import create_process_measurement


class ExtractionRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, source_sample, resulting_sample, process_measurement):
        original_sample, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=source_sample['barcode'],
            coordinates=source_sample['coordinates'])

        if original_sample:
            original_sample.depleted = True
            original_sample.volume -= process_measurement['volume_used']
            original_sample.save()

        destination_container_dict = resulting_sample['container']

        parent_barcode = destination_container_dict['parent_barcode']
        if parent_barcode:
            container_parent, self.errors['parent_container'], self.warnings['parent_container'] = \
                get_container(barcode=parent_barcode)
        else:
            container_parent = None

        destination_container, self.errors['container'], self.warnings['container'] = get_or_create_container(
            barcode=destination_container_dict['barcode'],
            kind=destination_container_dict['kind'],
            name=destination_container_dict['name'],
            coordinates=destination_container_dict['coordinates'],
            container_parent=container_parent,
        )

        if original_sample and destination_container:
            new_sample, self.errors['extracted_sample'], self.warnings['extracted_sample'] = create_sample(
                coordinates=resulting_sample['coordinates'],
                volume=resulting_sample['volume'],
                concentration=resulting_sample['concentration'],
                creation_date=resulting_sample['creation_date'],
                sample_kind=resulting_sample['kind'],

                container=destination_container,
                tissue_source=Sample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE.get(original_sample.sample_kind.name, ""),

                name=original_sample.name,
                collection_site=original_sample.collection_site,
                alias=original_sample.alias,
                phenotype=original_sample.phenotype,
                experimental_group=original_sample.experimental_group,
                individual=original_sample.individual,
            )

            if new_sample:
                _, self.errors['process_measurement'], self.warnings['process_measurement'] = \
                    create_process_measurement(
                        source_sample=original_sample,
                        process=process_measurement['process'],
                        execution_date=process_measurement['execution_date'],
                        volume_used=process_measurement['volume_used'],
                    )

from datetime import datetime

from fms_core.models import Sample
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.sample import create_sample, get_sample_from_container
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.sample_lineage import create_sample_lineage

class TransferRowHandler(GenericRowHandler):

    def process_row_inner(self, source_sample_info, resulting_sample_info, process_measurement_info):
        original_sample, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=source_sample_info['container']['barcode'],
            coordinates=source_sample_info['coordinates'])

        if original_sample:
            original_sample.depleted = source_sample_info['depleted']
            original_sample.volume -= process_measurement_info['volume_used']
            original_sample.save()

        destination_container_dict = resulting_sample_info['container']

        parent_barcode = destination_container_dict['parent_barcode']
        if parent_barcode:
            container_parent, self.errors['parent_container'], self.warnings['parent_container'] = \
                get_container(barcode=parent_barcode)
        else:
            container_parent = None

        destination_container, _, self.errors['container'], self.warnings['container'] = get_or_create_container(
            barcode=destination_container_dict['barcode'],
            kind=destination_container_dict['kind'],
            name=destination_container_dict['name'],
            coordinates=destination_container_dict['coordinates'],
            container_parent=container_parent,
        )

        if original_sample and destination_container:
            new_sample, self.errors['transfered_sample'], self.warnings['transfered_sample'] = create_sample(
                coordinates=resulting_sample_info['coordinates'],
                volume=resulting_sample_info['volume'],
                concentration=original_sample.concentration,
                creation_date=resulting_sample_info['creation_date'],
                sample_kind=original_sample.sample_kind,
                container=destination_container,
                tissue_source=original_sample.tissue_source,
                name=original_sample.name,
                collection_site=original_sample.collection_site,
                alias=original_sample.alias,
                phenotype=original_sample.phenotype,
                experimental_group=original_sample.experimental_group,
                individual=original_sample.individual,
            )

            if new_sample:
                process_measurement, self.errors['process_measurement'], self.warnings['process_measurement'] = \
                    create_process_measurement(
                        source_sample=original_sample,
                        process=process_measurement_info['process'],
                        execution_date=process_measurement_info['execution_date'],
                        volume_used=process_measurement_info['volume_used'],
                    )

                if process_measurement:
                    _, self.errors['sample_lineage'], self.warnings['sample_lineage'] = \
                        create_sample_lineage(
                            parent_sample=original_sample,
                            child_sample=new_sample,
                            process_measurement=process_measurement
                        )

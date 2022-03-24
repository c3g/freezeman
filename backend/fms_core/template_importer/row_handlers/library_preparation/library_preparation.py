from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container
from fms_core.services.container import create_container, get_container
from fms_core.services.index import get_index
from fms_core.services.library import prepare_library



class LibraryRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, library_batch_info, source_sample, volume_used,
                          comment, container, volume, index, strandedness):

        if not library_batch_info:
            self.errors['library_preparation'] = 'No batch is associated with this library.'

        # Calling the service creator for Samples in LibraryPreparation
        sample_obj, self.errors['container'], self.warnings['container'] = \
            get_sample_from_container(barcode=source_sample['barcode'], coordinates=source_sample['coordinates'])

        if not volume_used:
            self.errors['volume_used'] = f"Volume used must be entered"
        elif sample_obj and volume_used > sample_obj.volume:
            self.errors['volume_used'] = f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample_obj.volume})"

        if sample_obj:
            # Populate the libraries with the batch and  individual information
            container_coordinates = container['coordinates']

            container_parent_obj = None
            if container['parent_barcode']:
                container_parent_obj, self.errors['parent_container'], self.warnings['parent_container'] = \
                    get_container(barcode=container['parent_barcode'])

            container_obj, self.errors['library_container'], self.warnings['library_container'] = create_container(
                name=container['name'],
                barcode=container['barcode'],
                kind=container['kind'],
                container_parent=container_parent_obj if container_parent_obj else None,
                coordinates=container['parent_coordinates'] if container_parent_obj else None,
                creation_comment=comment)

            index_obj, self.errors['index'], self.warnings['index'] = get_index(index)

            library_info = dict(
                library_type=library_batch_info['library_type'],
                library_date=library_batch_info['library_date'],
                platform=library_batch_info['platform'],
                index=index_obj,
                strandedness=strandedness,
                library_volume=volume,
                library_comment=comment,
                container=container_obj,
                container_coordinates=container_coordinates,
                # Process measurement information,
                source_sample=sample_obj,
                volume_used=volume_used,
            )

            _, self.errors['library'], self.warnings['library'] = \
                prepare_library(**library_info,
                                protocol=library_batch_info['protocol'],
                                process_by_protocol=library_batch_info['process_by_protocol'])
        else:
            self.errors['sample_source'] = 'Sample source is needed to prepare a library.'

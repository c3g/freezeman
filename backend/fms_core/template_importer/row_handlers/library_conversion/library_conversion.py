from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container
from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.library import convert_library



class LibraryRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, library_batch_info, library_source, volume_used, comment, container, volume):

        if not library_batch_info:
            self.errors['library_conversion'] = 'No batch is associated with this library.'
        else:

            # Calling the service creator for Samples in LibraryPreparation
            sample_source_obj, self.errors['container'], self.warnings['container'] = \
                get_sample_from_container(barcode=library_source['barcode'], coordinates=library_source['coordinates'])

            if sample_source_obj:
                # Populate the libraries with the batch and  individual information
                container_coordinates = container['coordinates']

                container_parent_obj = None
                if container['parent_barcode']:
                    container_parent_obj, self.errors['parent_container'], self.warnings['parent_container'] = \
                        get_container(barcode=container['parent_barcode'])

                container_obj, created, self.errors['library_container'], self.warnings['library_container'] = get_or_create_container(
                    name=container['name'],
                    barcode=container['barcode'],
                    kind=container['kind'],
                    container_parent=container_parent_obj if container_parent_obj else None,
                    coordinates=container['parent_coordinates'] if container_parent_obj else None,
                    creation_comment=f"Automatically generated on {datetime.utcnow().isoformat()}Z via Library Conversion")

                if container_obj and not created:
                    self.warnings['library_container'] = f'Using existing container {container_obj.name}'

                library_info = dict(
                    execution_date=library_batch_info['execution_date'],
                    platform=library_batch_info['platform'],
                )

                protocol = library_batch_info['protocol']
                process_by_protocol = library_batch_info['process_by_protocol']

                # Retrieve process
                process_obj = process_by_protocol[protocol.id]

                library_destination, self.errors['library_conversion'], self.warnings['library_conversion'] = \
                    convert_library(process=process_obj,
                                    platform=library_info['platform'],
                                    sample_source=sample_source_obj,
                                    container_destination=container_obj,
                                    coordinates_destination=container_coordinates,
                                    volume_used=volume_used,
                                    volume_destination=volume,
                                    execution_date=library_info['execution_date'],
                                    comment=comment)
            else:
                self.errors['library_source'] = 'Library source is needed to convert a library.'

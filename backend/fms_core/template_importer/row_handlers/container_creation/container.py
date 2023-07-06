from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, create_container

class ContainerRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, container, parent_container):

        comment = container['comment'] if container['comment'] else f"Automatically generated via Container creation Template on {datetime.utcnow().isoformat()}Z"

        # Container related section

        parent_container_obj = None
        if parent_container['barcode']:
            parent_container_obj, self.errors['parent_container'], self.warnings['parent_container'] = get_container(barcode=parent_container['barcode'])

        container_obj, self.errors['container'], self.warnings['container'] = create_container(barcode=container['barcode'],
                                                                                               kind=container['kind'],
                                                                                               name=container['name'],
                                                                                               container_parent=parent_container_obj,
                                                                                               coordinates=container['coordinates'],
                                                                                               creation_comment=comment,
                                                                                              )
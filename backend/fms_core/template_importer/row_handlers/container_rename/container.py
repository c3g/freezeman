from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, rename_container

class ContainerRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, container, container_rename):
        # Container related section
        container_obj, self.errors['container'], self.warnings['container'] = get_container(barcode=container['barcode'])

        if not self.errors['container']:
            #Update
            _, self.errors['container_rename'], self.warnings['container_rename'] = rename_container(
                container_to_update=container_obj,
                barcode=container_rename['new_barcode'],
                name=container_rename['new_name'],
                update_comment=container_rename['comment'],
            )
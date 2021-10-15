from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, rename_container

class ContainerRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, container, container_rename):

        comment = f"Automatically generated via Container creation Template on {datetime.utcnow().isoformat()}Z"

        # Container related section
        container_obj, self.errors['container'], self.warnings['container'] = get_container(barcode=container['barcode'])

        if self.errors['container']:
            return

        if not all([container_rename['new_barcode'], container_rename['new_name']]):
            self.errors['container_rename'] = f'New Barcode and New Name are required.'
            return

        #Update
        container_obj.barcode = container_rename['new_barcode']
        container_obj.name = container_rename['new_name']
        container_obj.update_comment = container_rename['comment']

        _, self.errors['container_rename'], self.warnings['container_rename'] = rename_container(
            container_to_update=container_obj,
            barcode=container_rename['new_barcode'],
            name=container_rename['new_name'],
            update_comment=container_rename['comment'],
        )
from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, move_container

class ContainerRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, container, destination_container):
        # Container related section
        container_obj, self.errors['container'], self.warnings['container'] = get_container(barcode=container['barcode'])
        self.warnings['container'] = [(x, []) for x in self.warnings['container']]

        if not self.errors['container']:
            #Update
            _, self.errors['container_move'], self.warnings['container_move'] = move_container(
                container_to_move=container_obj,
                destination_barcode=destination_container['destination_barcode'],
                destination_coordinates=destination_container['destination_coordinates'],
                update_comment=destination_container['comment'],
            )
            self.warnings['container_move'] = [(x, []) for x in self.warnings['container_move']]
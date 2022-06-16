from fms_core.models import Process, Protocol

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.container_move import ContainerRowHandler
from fms_core.templates import CONTAINER_MOVE_TEMPLATE

from fms_core.utils import str_cast_and_normalize

class ContainerMoveImporter(GenericImporter):
    SHEETS_INFO = CONTAINER_MOVE_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        container_move_sheet = self.sheets['ContainerMove']

        for row_id, row_data in enumerate(container_move_sheet.rows):
            container = {
                'barcode': str_cast_and_normalize(row_data['Container Barcode to move'])
            }
            destination_container = {
                'destination_barcode': str_cast_and_normalize(row_data['Dest. Location Barcode']),
                'destination_coordinates': str_cast_and_normalize(row_data['Dest. Location Coord']),
                'comment': str_cast_and_normalize(row_data['Update Comment']),
            }

            container_move_kwargs = dict(
                container=container,
                destination_container=destination_container,
            )

            (result, _) = self.handle_row(
                row_handler_class=ContainerRowHandler,
                sheet=container_move_sheet,
                row_i=row_id,
                **container_move_kwargs,
            )

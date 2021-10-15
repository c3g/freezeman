from fms_core.models import Process, Protocol

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.container_move import ContainerRowHandler

class ContainerMoveImporter(GenericImporter):
    SHEETS_INFO = [
        {'name': 'ContainerMove', 'header_row_nb': 5},
    ]

    def __init__(self):
        super().__init__()
        # Preload objects accessible to the whole template (not only by row)
        self.preload_data_from_template()

    def import_template_inner(self):
        print('Import Container Rename Sheet - import template inner')
        container_move_sheet = self.sheets['ContainerMove']

        for row_id, row_data in enumerate(container_move_sheet.rows):
            container = {
                'barcode': row_data['Container Barcode to move']
            }
            destination_container = {
                'destination_barcode': row_data['Dest. Location Barcode'],
                'destination_coordinates': row_data['Dest. Location Coord'],
                'comment': row_data['Update Comment'],
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

            print('container move end of processing row ', row_id)
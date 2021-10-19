from fms_core.models import Process, Protocol

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.container_rename import ContainerRowHandler

class ContainerRenameImporter(GenericImporter):
    SHEETS_INFO = [
        {'name': 'ContainerRename', 'header_row_nb': 5},
    ]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        print('Import Container Rename Sheet - import template inner')
        container_rename_sheet = self.sheets['ContainerRename']

        for row_id, row_data in enumerate(container_rename_sheet.rows):
            container = {
                'barcode': row_data['Old Container Barcode']
            }
            container_rename = {
                'new_barcode': row_data['New Container Barcode'],
                'new_name': row_data['New Container Name'],
                'comment': row_data['Update Comment'],
            }

            container_rename_kwargs = dict(
                container=container,
                container_rename=container_rename,
            )

            (result, _) = self.handle_row(
                row_handler_class=ContainerRowHandler,
                sheet=container_rename_sheet,
                row_i=row_id,
                **container_rename_kwargs,
            )

            print('container rename end of processing row ', row_id)

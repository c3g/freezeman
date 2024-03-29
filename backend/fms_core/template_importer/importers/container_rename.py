from fms_core.models import Process, Protocol

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.container_rename import ContainerRowHandler
from fms_core.templates import CONTAINER_RENAME_TEMPLATE

from fms_core.utils import str_cast_and_normalize

class ContainerRenameImporter(GenericImporter):
    SHEETS_INFO = CONTAINER_RENAME_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        container_rename_sheet = self.sheets['ContainerRename']

        for row_id, row_data in enumerate(container_rename_sheet.rows):
            container = {
                'barcode': str_cast_and_normalize(row_data['Old Container Barcode'])
            }
            container_rename = {
                'new_barcode': str_cast_and_normalize(row_data['New Container Barcode']),
                'new_name': str_cast_and_normalize(row_data['New Container Name']),
                'comment': str_cast_and_normalize(row_data['Update Comment']),
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

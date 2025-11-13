from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.index_update import IndexUpdateRowHandler
from fms_core.templates import INDEX_UPDATE_TEMPLATE

from fms_core.utils import str_cast_and_normalize

class IndexUpdateImporter(GenericImporter):
    SHEETS_INFO = INDEX_UPDATE_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        index_update_sheet = self.sheets['Library']

        for row_id, row_data in enumerate(index_update_sheet.rows):
            library = {
                'alias': str_cast_and_normalize(row_data['Library Name']),
                'barcode': str_cast_and_normalize(row_data['Library Container Barcode']),
                'coordinates': str_cast_and_normalize(row_data['Library Container Coord'])
            }
            index = {
                'old_index': str_cast_and_normalize(row_data['Old Index Name']),
                'new_index': str_cast_and_normalize(row_data['New Index Name']),
            }

            index_update_kwargs = dict(
                library=library,
                index=index,
            )

            (result, _) = self.handle_row(
                row_handler_class=IndexUpdateRowHandler,
                sheet=index_update_sheet,
                row_i=row_id,
                **index_update_kwargs,
            )

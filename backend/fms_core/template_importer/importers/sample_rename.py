from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_rename import SampleRenameRowHandler, SampleRenameKwargs
from fms_core.templates import SAMPLE_RENAME_TEMPLATE
from fms_core.workbooks.sample_rename import HeaderNames
from fms_core.utils import str_cast_and_normalize

class SampleRenameImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_RENAME_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.workbook_generator = SAMPLE_RENAME_TEMPLATE["identity"].get("workbook_generator", None)

    def import_template_inner(self):
        sample_rename_sheet = self.sheets['SampleRename']
        for row_id, row_data in enumerate(sample_rename_sheet.rows):
            sample: SampleRenameKwargs = {
                'barcode': str_cast_and_normalize(row_data[HeaderNames.CONTAINER_BARCODE]),
                'parent_barcode': str_cast_and_normalize(row_data[HeaderNames.PARENT_CONTAINER_BARCODE]),
                'coordinates': str_cast_and_normalize(row_data[HeaderNames.CONTAINER_COORD]),
                'index': str_cast_and_normalize(row_data[HeaderNames.INDEX_NAME]),
                'old_alias': str_cast_and_normalize(row_data[HeaderNames.OLD_SAMPLE_ALIAS]),
                'new_alias': str_cast_and_normalize(row_data[HeaderNames.NEW_SAMPLE_ALIAS]),
                'old_name': str_cast_and_normalize(row_data[HeaderNames.OLD_SAMPLE_NAME]),
                'new_name': str_cast_and_normalize(row_data[HeaderNames.NEW_SAMPLE_NAME]),
            }
            sample_rename_kwargs = dict(
                sample=sample,
            )

            (result, row_object) = self.handle_row(
                row_handler_class=SampleRenameRowHandler,
                sheet=sample_rename_sheet,
                row_i=row_id,
                **sample_rename_kwargs,
            )

from collections import defaultdict

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_rename import SampleRenameRowHandler
from fms_core.templates import SAMPLE_RENAME_TEMPLATE

from fms_core.models import Index
from fms_core.utils import str_cast_and_normalize

class SampleRenameImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_RENAME_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.workbook_generator = SAMPLE_RENAME_TEMPLATE["identity"].get("workbook_generator", None)

    def import_template_inner(self):
        sample_rename_sheet = self.sheets['SampleRename']
        alias_updates = dict[str, str]()
        for row_id, row_data in enumerate(sample_rename_sheet.rows):
            sample = {
                'barcode': str_cast_and_normalize(row_data['Container Barcode']),
                'coordinates': str_cast_and_normalize(row_data['Container Coord']),
                'index': str_cast_and_normalize(row_data['Index Name']),
                'old_alias': str_cast_and_normalize(row_data['Old Sample Alias']),
                'new_alias': str_cast_and_normalize(row_data['New Sample Alias']),
                'old_name': str_cast_and_normalize(row_data['Old Sample Name']),
                'new_name': str_cast_and_normalize(row_data['New Sample Name']),
            }
            sample_rename_kwargs = dict(
                sample=sample,
            )

            if sample['old_alias'] in alias_updates and alias_updates[sample['old_alias']] != sample['new_alias']:
                # Check for different new names for the same old name
                sample_rename_sheet.rows_results[row_id]["warnings"].append(f"Replacing new name [{alias_updates.get(sample['old_alias'])}] for sample [{sample['old_alias']}] to another new name [{sample['new_alias']}].")

            (result, row_object) = self.handle_row(
                row_handler_class=SampleRenameRowHandler,
                sheet=sample_rename_sheet,
                row_i=row_id,
                **sample_rename_kwargs,
            )

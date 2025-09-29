from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.index_creation import IndexCreationHandler
from fms_core.templates import INDEX_CREATION_TEMPLATE

from fms_core.utils import comma_separated_string_to_array, str_cast_and_normalize

class IndexCreationImporter(GenericImporter):
    SHEETS_INFO = INDEX_CREATION_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        index_creation_sheet = self.sheets['Indices']

        for row_id, row_data in enumerate(index_creation_sheet.rows):
            index = {
                'name': str_cast_and_normalize(row_data['Index Name']),
                'external_name': str_cast_and_normalize(row_data['External Index Name']),
                'index_structure': str_cast_and_normalize(row_data['Index Structure']),
                'index_3prime': comma_separated_string_to_array(row_data['Index 3 Prime']),
                'index_5prime': comma_separated_string_to_array(row_data['Index 5 Prime']),
            }

            index_creation_kwargs = dict(
                set_name=str_cast_and_normalize(row_data['Set Name']),
                index=index,
            )

            (result, _) = self.handle_row(
                row_handler_class=IndexCreationHandler,
                sheet=index_creation_sheet,
                row_i=row_id,
                **index_creation_kwargs,
            )
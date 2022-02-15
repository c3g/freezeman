from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.index_creation import IndexCreationHandler
from fms_core.templates import INDEX_CREATION_TEMPLATE


class IndexCreationImporter(GenericImporter):
    SHEETS_INFO = INDEX_CREATION_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        index_creation_sheet = self.sheets['Indices']

        for row_id, row_data in enumerate(index_creation_sheet.rows):
            index = {
                'name': row_data['Name'],
                'index_structure': row_data['Index Structure'],
                'index_3prime': row_data['Index 3 Prime'] if row_data['Index 3 Prime'] else '',
                'index_5prime': row_data['Index 5 Prime'] if row_data['Index 5 Prime'] else '',
            }

            index_creation_kwargs = dict(
                set_name=row_data['Set Name'],
                index=index,
            )

            (result, _) = self.handle_row(
                row_handler_class=IndexCreationHandler,
                sheet=index_creation_sheet,
                row_i=row_id,
                **index_creation_kwargs,
            )
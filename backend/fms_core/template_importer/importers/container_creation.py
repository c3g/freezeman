from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.container_creation import ContainerRowHandler

class ContainerCreationImporter(GenericImporter):
    SHEETS_INFO = [
        {'name': 'ContainerCreation', 'header_row_nb': 6},
    ]

    def __init__(self):
        super().__init__()
        # Preload objects accessible to the whole template (not only by row)
        self.preload_data_from_template()

    def preload_data_from_template(self):
        pass

    def import_template_inner(self):
        containers_sheet = self.sheets['ContainerCreation']

        for row_id, row_data in enumerate(containers_sheet.rows):
            container = {
                'kind': row_data['Container Kind'],
                'name': row_data['Container Name'],
                'barcode': row_data['Container Barcode'],
            }
            parent_container = {
                'barcode': row_data['Location Barcode'],
            }

            container_kwargs = dict(
                container=container,
                parent_container=parent_container,
            )

            (result, _) = self.handle_row(
                row_handler_class=ContainerRowHandler,
                sheet=containers_sheet,
                row_i=row_id,
                **container_kwargs,
            )
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.container_creation import ContainerRowHandler

class ContainerCreationImporter(GenericImporter):
    SHEETS_INFO = [
        {
            'name': 'ContainerCreation',
            'headers': ['Container Kind', 'Container Name', 'Container Barcode', 'Parent Container Barcode',
                        'Parent Container Coordinates'
                        ],
         },
    ]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        containers_sheet = self.sheets['ContainerCreation']

        for row_id, row_data in enumerate(containers_sheet.rows):
            container = {
                'kind': row_data['Container Kind'],
                'name': row_data['Container Name'],
                'barcode': row_data['Container Barcode'],
                'coordinates': row_data['Parent Container Coordinates'],
            }
            parent_container = {
                'barcode': row_data['Parent Container Barcode'],
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
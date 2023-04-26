from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.container_creation import ContainerRowHandler
from fms_core.templates import CONTAINER_CREATION_TEMPLATE

from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower

class ContainerCreationImporter(GenericImporter):
    SHEETS_INFO = CONTAINER_CREATION_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        containers_sheet = self.sheets['ContainerCreation']

        for row_id, row_data in enumerate(containers_sheet.rows):
            container = {
                'kind': str_cast_and_normalize_lower(row_data['Container Kind']),
                'name': str_cast_and_normalize(row_data['Container Name']),
                'barcode': str_cast_and_normalize(row_data['Container Barcode']),
                'coordinates': str_cast_and_normalize(row_data['Parent Container Coordinates']),
                'comment': str_cast_and_normalize(row_data['Comment']),
            }
            parent_container = {
                'barcode': str_cast_and_normalize(row_data['Parent Container Barcode']),
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
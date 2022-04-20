from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_add_metadata import SampleAddMetadataHandler
from fms_core.templates import SAMPLE_METADATA_TEMPLATE

from .._utils import input_string_to_snake_case

METADATA_STARTING_INDEX = 4

class SampleAddMetadataImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_METADATA_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.metadata_starting_index = METADATA_STARTING_INDEX

    def import_template_inner(self):
        """
            METADATA SHEET
        """
        metadata_sheet = self.sheets['Metadata']

        # Iterate through experiment rows
        for row_id, row in enumerate(metadata_sheet.rows):
            row_data = {}
            metadata = {}
            for i, (key, val) in enumerate(row.items()):
                if i < self.metadata_starting_index:
                    row_data[key] = row[key]
                # Just add metadata if the cell is not empty, else ignore
                elif row[key]:
                    formatted_name = input_string_to_snake_case(key)
                    metadata[formatted_name] = val

            sample_add_properties = dict(
                # ExperimentRun attributes data dictionary and related objects
                action=row_data['Action'].upper() if row_data['Action'] else None,
                sample_info={
                    'name': row_data['Sample Name'],
                    'container_barcode': row_data['Sample Container Barcode'],
                    'container_coordinates': row_data['Sample Container Coordinates'],
                },
                metadata=metadata,
            )

            (result, _) = self.handle_row(
                row_handler_class=SampleAddMetadataHandler,
                sheet=metadata_sheet,
                row_i=row_id,
                **sample_add_properties,
            )
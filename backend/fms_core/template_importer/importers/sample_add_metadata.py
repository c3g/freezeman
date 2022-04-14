from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_add_metadata import SampleAddMetadataHandler
from fms_core.templates import SAMPLE_ADD_METADATA_TEMPLATE

METADATA_STARTING_INDEX = 4

class SampleAddMetadataImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_ADD_METADATA_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.metadata_starting_index = METADATA_STARTING_INDEX

    def import_template_inner(self):
        """
            METADATA SHEET
        """
        metadata_sheet = self.sheets['Metadata']

        # Add the extra headers to the template sheet according to the metadata
        metadata_headers = [key for i, (key, val) in enumerate(metadata_sheet.rows[0].items()) if i >= self.metadata_starting_index]
        extra_headers = {
            # sheet_number : extra metadata headers
            0: metadata_headers
        }
        self.add_dynamic_headers(extra_headers)

        # Iterate through experiment rows
        for row_id, row in enumerate(metadata_sheet.rows):
            row_data = {}
            metadata = {}
            for i, (key, val) in enumerate(row.items()):
                if i < self.metadata_starting_index:
                    row_data[key] = row[key]
                # Just add metadata if the cell is not empty, else ignore
                elif row[key]:
                    metadata[key] = val

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
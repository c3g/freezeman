from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_add_properties import SampleAddPropertiesHandler
from fms_core.templates import SAMPLE_ADD_PROPERTIES_TEMPLATE

PROPERTIES_STARTING_INDEX = 4

class SampleAddPropertiesImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_ADD_PROPERTIES_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX

    def import_template_inner(self):
        """
            PROPERTIES SHEET
        """
        properties_sheet = self.sheets['Properties']
        # Iterate through experiment rows
        for row_id, row in enumerate(properties_sheet.rows):
            row_data = {}
            properties = {}
            for i, (key, val) in enumerate(row.items()):
                if i < self.properties_starting_index:
                    row_data[key] = row[key]
                else:
                    properties[key] = val

            sample_add_properties = dict(
                # ExperimentRun attributes data dictionary and related objects
                action=row_data['Action'].upper() if row_data['Action'] else None,
                sample_info={
                    'name': row_data['Sample Name'],
                    'container_barcode': row_data['Sample Container Barcode'],
                    'container_coordinates': row_data['Sample Container Coordinates'],
                },
                properties=properties,
            )

            (result, _) = self.handle_row(
                row_handler_class=SampleAddPropertiesHandler,
                sheet=properties_sheet,
                row_i=row_id,
                **sample_add_properties,
            )
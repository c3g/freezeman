from fms_core.models import Protocol, Process
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.extraction import ExtractionRowHandler


class ExtractionImporter(GenericImporter):
    SHEETS_INFO = [
        {'name': 'ExtractionTemplate', 'header_row_nb': 6},
    ]


    def __init__(self):
        super().__init__()
        # Preload objects accessible to the whole template (not only by row)
        self.preload_data_from_template()


    def preload_data_from_template(self):
        self.preloaded_data = {'process': None}

        extraction_protocol = Protocol.objects.get(name="Extraction")
        self.preloaded_data['process'] = Process.objects.create(protocol=extraction_protocol, comment="Extracted samples (imported from template)")


    def import_template_inner(self):
        sheet = self.sheets['ExtractionTemplate']

        for row_id, row_data in enumerate(sheet.rows):
            extraction_date = row_data['Extraction Date']

            source_sample = {
                'coordinates': row_data['Source Container Coord'],
                'container': {'barcode': row_data['Source Container Barcode']},
                'depleted': row_data['Source Depleted'],
            }

            resulting_sample = {
                'coordinates': row_data['Destination Container Coord'],
                'volume': row_data['Volume (uL)'],
                'concentration': row_data['Conc. (ng/uL)'],
                'kind': row_data['Extraction Type'],
                'creation_date': extraction_date,
                'container': {
                    'barcode': row_data['Destination Container Barcode'],
                    'name': row_data['Destination Container Name'],
                    'kind': row_data['Destination Container Kind'],
                    'coordinates': row_data['Destination Parent Container Coord'],
                    'parent_barcode': row_data['Destination Parent Container Barcode'],
                },
            }

            process_measurement = {
                'execution_date': extraction_date,
                'volume_used': row_data['Volume Used (uL)'],
                'comment': row_data['Comment'],
                'process': self.preloaded_data['process']
            }

            extraction_kwargs = dict(
                source_sample=source_sample,
                resulting_sample=resulting_sample,
                process_measurement=process_measurement,
            )

            (result, _) = self.handle_row(
                row_handler_class=ExtractionRowHandler,
                sheet=sheet,
                row_i=row_id,
                **extraction_kwargs,
            )
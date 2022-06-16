from fms_core.models import Protocol, Process, SampleKind
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.extraction import ExtractionRowHandler
from fms_core.templates import SAMPLE_EXTRACTION_TEMPLATE
from .._utils import (float_to_decimal_and_none, input_to_date_and_none)
from fms_core.utils import str_cast_and_normalize
from datetime import datetime

class ExtractionImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_EXTRACTION_TEMPLATE["sheets info"]


    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()


    def initialize_data_for_template(self):
        self.preloaded_data = {'process': None, 'sample_kinds': {}}

        self.preloaded_data['process'] = Process.objects.create(protocol=Protocol.objects.get(name="Extraction"),
                                                                comment="Extracted samples (imported from template)")

        self.preloaded_data['sample_kinds'] = SampleKind.objects.all().in_bulk(field_name="name")


    def import_template_inner(self):
        sheet = self.sheets['ExtractionTemplate']

        for row_id, row_data in enumerate(sheet.rows):
            volume_decimal = float_to_decimal_and_none(row_data['Volume (uL)'])
            volume_used_decimal = float_to_decimal_and_none(row_data['Volume Used (uL)'])
            concentration_decimal = float_to_decimal_and_none(row_data['Conc. (ng/uL)'])
            extraction_date = input_to_date_and_none(row_data['Extraction Date'])
            sample_kind = str_cast_and_normalize(row_data['Extraction Type'])

            source_sample = {
                'coordinates': str_cast_and_normalize(row_data['Source Container Coord']),
                'container': {'barcode': str_cast_and_normalize(row_data['Source Container Barcode'])},
                'depleted': str_cast_and_normalize(row_data['Source Depleted']),
            }

            resulting_sample = {
                'coordinates': str_cast_and_normalize(row_data['Destination Container Coord']),
                'volume': volume_decimal,
                'concentration': concentration_decimal,
                'creation_date': extraction_date,
                'kind': self.preloaded_data['sample_kinds'][sample_kind],
                'container': {
                    'barcode': str_cast_and_normalize(row_data['Destination Container Barcode']),
                    'name': str_cast_and_normalize(row_data['Destination Container Name']),
                    'kind': str_cast_and_normalize(row_data['Destination Container Kind']),
                    'coordinates': str_cast_and_normalize(row_data['Destination Parent Container Coord']),
                    'parent_barcode': str_cast_and_normalize(row_data['Destination Parent Container Barcode']),
                },
            }

            process_measurement = {
                'execution_date': extraction_date,
                'volume_used': volume_used_decimal,
                'comment': str_cast_and_normalize(row_data['Comment']),
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
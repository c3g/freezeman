from fms_core.models import Protocol, Process
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.transfer import TransferRowHandler
from fms_core.templates import SAMPLE_TRANSFER_TEMPLATE
from .._utils import (float_to_decimal_and_none, input_to_date_and_none)
from datetime import datetime

class TransferImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_TRANSFER_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()


    def initialize_data_for_template(self):
        self.preloaded_data = {'process': None}

        self.preloaded_data['process'] = Process.objects.create(protocol=Protocol.objects.get(name="Transfer"),
                                                                comment="Sample Transfer (imported from template)")

    def import_template_inner(self):
        sheet = self.sheets['SampleTransfer']

        for row_id, row_data in enumerate(sheet.rows):
            volume_used_decimal = float_to_decimal_and_none(row_data['Volume Used (uL)'])
            transfer_date = input_to_date_and_none(row_data['Transfer Date'])

            source_sample = {
                'coordinates': row_data['Source Container Coord'],
                'container': {'barcode': row_data['Source Container Barcode']},
                'depleted': row_data['Source Depleted'],
            }

            resulting_sample = {
                'coordinates': row_data['Destination Container Coord'],
                'volume': volume_used_decimal,
                'creation_date': transfer_date,
                'container': {
                    'barcode': row_data['Destination Container Barcode'],
                    'name': row_data['Destination Container Name'],
                    'kind': row_data['Destination Container Kind'],
                    'coordinates': row_data['Destination Parent Container Coord'],
                    'parent_barcode': row_data['Destination Parent Container Barcode'],
                },
            }

            process_measurement = {
                'execution_date': transfer_date,
                'volume_used': volume_used_decimal,
                'comment': row_data['Comment'],
                'process': self.preloaded_data['process']
            }

            transfer_kwargs = dict(
                source_sample=source_sample,
                resulting_sample=resulting_sample,
                process_measurement=process_measurement,
            )

            (result, _) = self.handle_row(
                row_handler_class=TransferRowHandler,
                sheet=sheet,
                row_i=row_id,
                **transfer_kwargs,
            )
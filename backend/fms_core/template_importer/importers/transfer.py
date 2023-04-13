from fms_core.models import Protocol, Process
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.transfer import TransferRowHandler
from fms_core.templates import SAMPLE_TRANSFER_TEMPLATE
from .._utils import (float_to_decimal_and_none, input_to_date_and_none)
from datetime import datetime
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower
from fms_core.services.step import get_step_from_template

class TransferImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_TRANSFER_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()


    def initialize_data_for_template(self):
        #Get protocol for Transfer
        protocol = Protocol.objects.get(name='Transfer')

        self.preloaded_data = {'process': None, 'protocol': protocol}

        self.preloaded_data['process'] = Process.objects.create(protocol=Protocol.objects.get(name="Transfer"),
                                                                comment="Sample Transfer (imported from template)")

    def import_template_inner(self):
        sheet = self.sheets['SampleTransfer']

        # Identify for each row of the matching workflow step
        step_by_row_id, errors, warnings = get_step_from_template(self.preloaded_data['protocol'], self.sheets, self.SHEETS_INFO)
        self.base_errors.extend(errors)

        # Add the template to the process
        if self.imported_file is not None:
            self.preloaded_data['process'].imported_template_id = self.imported_file.id
            self.preloaded_data['process'].save()

        for row_id, row_data in enumerate(sheet.rows):
            volume_used_decimal = float_to_decimal_and_none(row_data['Volume Used (uL)'])
            transfer_date = input_to_date_and_none(row_data['Transfer Date'])

            source_sample = {
                'coordinates': str_cast_and_normalize(row_data['Source Container Coord']),
                'container': {'barcode': str_cast_and_normalize(row_data['Source Container Barcode'])},
                'depleted': str_cast_and_normalize(row_data['Source Depleted']),
            }

            resulting_sample = {
                'coordinates': str_cast_and_normalize(row_data['Destination Container Coord']),
                'volume': volume_used_decimal,
                'creation_date': transfer_date,
                'container': {
                    'barcode': str_cast_and_normalize(row_data['Destination Container Barcode']),
                    'name': str_cast_and_normalize(row_data['Destination Container Name']),
                    'kind': str_cast_and_normalize_lower(row_data['Destination Container Kind']),
                    'coordinates': str_cast_and_normalize(row_data['Destination Parent Container Coord']),
                    'parent_barcode': str_cast_and_normalize(row_data['Destination Parent Container Barcode']),
                },
            }

            process_measurement = {
                'execution_date': transfer_date,
                'volume_used': volume_used_decimal,
                'comment': str_cast_and_normalize(row_data['Comment']),
                'process': self.preloaded_data['process']
            }

            workflow = {
                'step_action': str_cast_and_normalize(row_data['Workflow Action']),
                'step': step_by_row_id[row_id]
            }

            transfer_kwargs = dict(
                source_sample=source_sample,
                resulting_sample=resulting_sample,
                process_measurement=process_measurement,
                workflow=workflow,
            )

            (result, _) = self.handle_row(
                row_handler_class=TransferRowHandler,
                sheet=sheet,
                row_i=row_id,
                **transfer_kwargs,
            )
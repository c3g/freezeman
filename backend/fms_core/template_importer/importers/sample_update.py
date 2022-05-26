from fms_core.models import Process, Protocol

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_update import SampleRowHandler
from fms_core.templates import SAMPLE_UPDATE_TEMPLATE
from .._utils import float_to_decimal_and_none, input_to_date_and_none

class SampleUpdateImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_UPDATE_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        self.preloaded_data = {'process': None}

        self.preloaded_data['process'] = Process.objects.create(protocol=Protocol.objects.get(name="Update"),
                                                                comment="Updated samples (imported from template)")

    def import_template_inner(self):
        sampleupdate_sheet = self.sheets['SampleUpdate']

        for row_id, row_data in enumerate(sampleupdate_sheet.rows):
            sample = {
                'coordinates': row_data['Coord (if plate)'],
                'container': {'barcode': row_data['Container Barcode']}
            }
            sample_updated = {
                'volume': float_to_decimal_and_none(row_data['New Volume (uL)']),
                'concentration': float_to_decimal_and_none(row_data['New Conc. (ng/uL)']),
                'depleted': row_data['Depleted'],
            }

            process_measurement = {
                'process': self.preloaded_data['process'],
                'execution_date': input_to_date_and_none(row_data['Update Date']),
                'comment': row_data['Update Comment'],
            }

            sample_update_kwargs = dict(
                delta_volume=float_to_decimal_and_none(row_data['Delta Volume (uL)']),
                sample=sample,
                sample_updated=sample_updated,
                process_measurement=process_measurement,
            )

            (result, _) = self.handle_row(
                row_handler_class=SampleRowHandler,
                sheet=sampleupdate_sheet,
                row_i=row_id,
                **sample_update_kwargs,
            )

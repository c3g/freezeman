from fms_core.models import Process, Protocol

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_update import SampleRowHandler

class SampleSubmissionImporter(GenericImporter):
    SHEETS_INFO = [
        {'name': 'SampleUpdate', 'header_row_nb': 4},
    ]

    def __init__(self):
        super().__init__()
        # Preload objects accessible to the whole template (not only by row)
        self.preload_data_from_template()

    def preload_data_from_template(self):
        self.preloaded_data = {'process': None}

        self.preloaded_data['process'] = Process.objects.create(protocol=Protocol.objects.get(name="Update"),
                                                                comment="Updated samples (imported from template)")

    def import_template_inner(self):
        print('Import Sample Update Sheet - import template inner')
        sampleupdate_sheet = self.sheets['SampleUpdate']

        for row_id, row_data in enumerate(sampleupdate_sheet.rows):
            sample = {
                'coordinates': row_data['Coord (if plate)'],
                'container': {'barcode': row_data['Container Barcode']}
            }
            sample_updated = {
                'volume': row_data['New Volume (uL)'],
                'concentration': row_data['New Conc. (ng/uL)'],
                'depleted': row_data['Depleted'],
            }

            process_measurement = {
                'process': self.preloaded_data['process'],
                'volume_used': row_data['Delta Volume (uL)'],
                'execution_date': row_data['Update Date'],
                'comment': row_data['Update Comment'],
            }

            sample_update_kwargs = dict(
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

            print('sample submission end of processing row ', row_id)
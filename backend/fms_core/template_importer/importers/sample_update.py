from ._generic import GenericImporter
# from fms_core.template_importer.row_handlers.sample_update import SampleRowHandler

class SampleSubmissionImporter(GenericImporter):
    SHEETS_INFO = [
        {'name': 'SampleUpdate', 'header_row_nb': 4},
    ]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        print('Import Sample Update Sheet - import template inner')
        sampleupdate_sheet = self.sheets['SampleUpdate']
from fms_core.services.sample import get_sample_from_container
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

class LibraryQCRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, container, measures, quality):
         # Get the library sample that was checked
        source_sample_obj, self.errors['container'], self.warnings['container'] = \
            get_sample_from_container(barcode=container['barcode'], coordinates=container['coordinates'])

        if source_sample_obj is None:
            self.errors['sample_source'] = 'Library sample for QC was not found at the specified container.'
            return

        
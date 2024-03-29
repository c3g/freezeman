from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.library import get_library_selection
from fms_core.services.process import create_process
from fms_core.services.property_value import create_process_properties

from datetime import datetime


class CaptureBatchRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, protocol, process_properties, capture_type, comment, imported_template=None):

        library_selection_obj, self.errors['capture_type'], self.warnings['capture_type'] = \
            get_library_selection(name="Capture", target=capture_type)

        process_by_protocol, self.errors['library_capture'], self.warnings['library_capture'] = \
            create_process(protocol=protocol,
                           creation_comment=comment if comment
                           else f"Automatically generated via library capture preparation "f"on {datetime.utcnow().isoformat()}Z",
                           imported_template=imported_template)

        # Create process' properties
        properties, self.errors['process_properties'], self.warnings['process_properties'] = \
            create_process_properties(process_properties, process_by_protocol)

        if not library_selection_obj:
            self.errors['library_capture'] = f"Capture type is required for capture preparation."

        if not properties:
            self.errors['library_capture'] = f"Unable to process this capture batch."

        self.row_object = {
            'process_by_protocol': process_by_protocol,
            'library_selection': library_selection_obj,
        }


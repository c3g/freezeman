from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.library import get_selection_method
from fms_core.services.process import create_process
from fms_core.services.property_value import create_process_properties

from datetime import datetime


class CaptureBatchRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, protocol, process_properties, capture_type, comment, imported_template=None):

        capture_type_obj, self.errors['capture_type'], self.warnings['capture_type'] = \
            get_selection_method(capture_type)

        process_by_protocol, self.errors['capture_preparation'], self.warnings['capture_preparation'] = \
            create_process(protocol=protocol,
                           creation_comment=comment if comment
                           else f"Automatically generated via capture preparation "f"on {datetime.utcnow().isoformat()}Z",
                           imported_template=imported_template)

        # Create process' properties
        properties, self.errors['process_properties'], self.warnings['process_properties'] = \
            create_process_properties(process_properties, process_by_protocol)

        if not capture_type_obj:
            self.errors['capture_preparation'] = f"Capture type is required for capture preparation."

        if not properties:
            self.errors['capture_preparation'] = f"Unable to process this capture batch."


        self.row_object = {
            'process_by_protocol': process_by_protocol,
            'capture_type': capture_type_obj,
        }


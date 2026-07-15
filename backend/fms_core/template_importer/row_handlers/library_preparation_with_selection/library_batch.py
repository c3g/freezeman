from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.library import get_library_type, get_library_selection
from fms_core.services.platform import get_platform
from fms_core.services.process import create_process
from fms_core.services.property_value import create_process_properties

from datetime import datetime


class LibraryBatchRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, protocol, process_properties, library_type, library_selection, library_selection_target, platform, comment, imported_template=None):

        library_type_obj, self.errors['library_type'], self.warnings['library_type'] = \
            get_library_type(library_type)

        library_selection_obj, self.errors['library_selection'], self.warnings['library_selection'] = \
            get_library_selection(name=library_selection, target=library_selection_target)

        platform_obj, self.errors['platform'], self.warnings['platform'] = get_platform(platform)

        process_by_protocol, self.errors['library_preparation'], self.warnings['library_preparation'] = \
            create_process(protocol=protocol,
                           creation_comment=comment if comment
                           else f"Automatically generated via library preparation "f"on {datetime.utcnow().isoformat()}Z",
                           imported_template=imported_template)

        # Create process' properties
        properties, self.errors['process_properties'], self.warnings['process_properties'] = \
            create_process_properties(process_properties, process_by_protocol)

        if not library_type_obj:
            self.errors['library_preparation'] = f"Library type is required for library preparation with selection."

        if not library_selection_obj:
            self.errors['library_preparation'] = f"Library selection is required for library preparation with selection."

        if not platform_obj:
            self.errors['library_preparation'] = f"Platform is required for library preparation with selection."

        if not properties:
            self.errors['library_preparation'] = f"Unable to process this library batch."


        self.row_object = {
            'process_by_protocol': process_by_protocol,
            'library_type': library_type_obj,
            'library_selection': library_selection_obj,
            'platform': platform_obj,
        }


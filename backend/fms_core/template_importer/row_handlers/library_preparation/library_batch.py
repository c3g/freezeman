from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.library import get_library_type
from fms_core.services.platform import get_platform


class LibraryBatchRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, library_type, platform):

        library_type_obj, self.errors['library_type'], self.warnings['library_type'] = \
            get_library_type(library_type)

        platform_obj, self.errors['platform'], self.warnings['platform'] = get_platform(platform)

        if not library_type_obj:
            self.errors['library_preparation'] = f"Library type is required for library preparation."

        if not platform_obj:
            self.errors['library_preparation'] = f"Platform is required for library preparation."

        self.row_object = {
            'library_type': library_type_obj,
            'platform': platform_obj,
        }


from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.models.platform import Platform

from fms_core.services.library import create_library
from fms_core.services.library import get_library_type
from fms_core.services.platform import get_platform

class LibraryPreparationRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row(self, **kwargs):
        if len(kwargs['sample_rows_info']) < 1:
            self.errors['samples'] = f"No samples are associated to this library"

        return super(self.__class__, self).process_row(**kwargs)


    def process_row_inner(self, library_type, library_date, platform, comment,
                          sample_rows_info, process_properties):

        library_type_obj, self.errors['experiment_type'], self.warnings['experiment_type'] = get_library_type(library_type['name'])

        platform_obj, self.errors['platform'], self.warnings['platform'] = get_platform(platform['name'])

        if library_type_obj and platform_obj:
            _, self.errors['library'], self.warnings['library'] = create_library(library_type_obj,
                                                                                 library_date,
                                                                                 sample_rows_info,
                                                                                 process_properties,
                                                                                 comment)
        else:
            self.errors['library'] = f"Errors prevent the creation of the library."

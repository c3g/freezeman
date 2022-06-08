from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.platform import get_platform
from fms_core.services.process import create_process
from fms_core.services.property_value import create_process_properties

from datetime import datetime


class LibraryBatchRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, protocol, process_properties, platform, comment):
        platform_obj, self.errors['platform'], self.warnings['platform'] = get_platform(platform)

        process_by_protocol, self.errors['library_conversion'], self.warnings['library_conversion'] = \
            create_process(protocol=protocol,
                           creation_comment=comment if comment
                           else f"Automatically generated via library conversion "f"on {datetime.utcnow().isoformat()}Z")

        # Create process' properties
        properties, self.errors['process_properties'], self.warnings['process_properties'] = \
            create_process_properties(process_properties, process_by_protocol)

        if not platform_obj:
            self.errors['library_conversion'] = \
                f"A valid destination platform is required for library conversion. Choice(s) for the destination platform are: [DNBSEQ]"

        if not properties:
            self.errors['library_conversion'] = \
                f"Unable to process this library batch without the required valid metadata columns."


        self.row_object = {
            'process_by_protocol': process_by_protocol,
            'platform': platform_obj,
        }


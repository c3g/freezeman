import copy

from fms_core.models import PropertyType, Protocol
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.library_conversion import LibraryRowHandler, LibraryBatchRowHandler
from fms_core.templates import LIBRARY_CONVERSION_TEMPLATE
from collections import defaultdict
from .._utils import float_to_decimal_and_none, input_to_date_and_none
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower

PROPERTIES_STARTING_INDEX = 4

class LibraryConversionImporter(GenericImporter):
    SHEETS_INFO = LIBRARY_CONVERSION_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX

    def initialize_data_for_template(self):
        # Get protocol for Library Conversion
        protocol = Protocol.objects.get(name='Library Conversion')

        self.preloaded_data = {'protocol': protocol, 'process_properties': {}}

        # Preload PropertyType objects for this protocol in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = \
                {o.name: {'property_type_obj': o} for o in list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

    def import_template_inner(self):
        """
            LIBRARY BATCH SHEET
        """
        library_batch_sheet = self.sheets['Conversion Batch']

        # Iterate through libraries rows
        library_batch_rows_data = defaultdict(list)
        for row_id, row in enumerate(library_batch_sheet.rows):
            library_batch_dict = {}
            process_properties = self.preloaded_data['process_properties']
            for i, (key, val) in enumerate(row.items()):
                if i < self.properties_starting_index:
                    library_batch_dict[key] = row[key]
                else:
                    process_properties[key]['value'] = val

            (result, batch_objects) = self.handle_row(
                row_handler_class=LibraryBatchRowHandler,
                sheet=library_batch_sheet,
                row_i=row_id,
                protocol=self.preloaded_data['protocol'],
                process_properties=copy.deepcopy(process_properties),
                platform=str_cast_and_normalize(library_batch_dict['Platform']),
                comment=str_cast_and_normalize(library_batch_dict['Comment']),
                imported_template=self.imported_file
            )

            library_batch_info = dict(
                # Library attributes data dictionary and related objects
                execution_date=input_to_date_and_none(library_batch_dict['Date (YYYY-MM-DD)']),
                # Library Type and Platform
                **batch_objects,
                # Additional data for this row
                protocol=self.preloaded_data['protocol'],
            )

            library_batch_rows_data[library_batch_dict['Library Batch ID']] = library_batch_info

        """
            LIBRARIES SHEET
        """
        libraries_sheet = self.sheets['Library']
        for i, row_data in enumerate(libraries_sheet.rows):
            library_conversion_kwargs = {
                'library_batch_info': library_batch_rows_data[row_data['Library Batch ID']],
                'library_source':
                    {'barcode': str_cast_and_normalize(row_data['Library Source Container Barcode']),
                     'coordinates': str_cast_and_normalize(row_data['Library Source Container Coordinates']),
                     },
                'volume_used': float_to_decimal_and_none(row_data['Volume Used (uL)']),
                'comment': str_cast_and_normalize(row_data['Comment']),
                'container':
                    {'barcode': str_cast_and_normalize(row_data['Destination Library Container Barcode']),
                     'coordinates': str_cast_and_normalize(row_data['Destination Library Container Coordinates']),
                     'name': str_cast_and_normalize(row_data['Destination Library Container Name']),
                     'kind': str_cast_and_normalize_lower(row_data['Destination Library Container Kind']),
                     'parent_barcode': str_cast_and_normalize(row_data['Destination Library Parent Container Barcode']),
                     'parent_coordinates': str_cast_and_normalize(row_data['Destination Library Parent Container Coordinates'])
                     },
                'volume': float_to_decimal_and_none(row_data['Volume (uL)']),
                 }

            (result, _) = self.handle_row(
                row_handler_class=LibraryRowHandler,
                sheet=libraries_sheet,
                row_i=i,
                **library_conversion_kwargs,
            )


import copy

from fms_core.models import PropertyType, Protocol, Process
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.library_capture import LibraryRowHandler, CaptureBatchRowHandler
from fms_core.templates import LIBRARY_CAPTURE_TEMPLATE
from collections import defaultdict
from fms_core.services.step import get_step_from_template
from .._utils import float_to_decimal_and_none, input_to_date_and_none, load_all_or_float_to_decimal_and_none
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower

PROPERTIES_STARTING_INDEX = 4

class LibraryCaptureImporter(GenericImporter):
    SHEETS_INFO = LIBRARY_CAPTURE_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX

    def initialize_data_for_template(self):
        # Get protocol for Library Capture
        protocol = Protocol.objects.get(name='Library Capture')

        self.preloaded_data = {'protocol': protocol, 'process_properties': {}}

        # Preload PropertyType objects for this protocol in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = \
                {o.name: {'property_type_obj': o} for o in list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

    def import_template_inner(self):
        """
            CAPTURE BATCH SHEET
        """
        capture_batch_sheet = self.sheets['Capture Batch']

        # Identify for each row of the matching workflow step
        step_by_row_id, errors, warnings = get_step_from_template(self.preloaded_data['protocol'], self.sheets, self.SHEETS_INFO)
        self.base_errors.extend(errors)

        # Iterate through libraries rows
        capture_batch_rows_data = defaultdict(list)
        for row_id, row in enumerate(capture_batch_sheet.rows):
            capture_batch_dict = {}
            process_properties = self.preloaded_data['process_properties']
            for i, (key, val) in enumerate(row.items()):
                if i < self.properties_starting_index:
                    capture_batch_dict[key] = row[key]
                else:
                    process_properties[key]['value'] = val

            (result, batch_objects) = self.handle_row(
                row_handler_class=CaptureBatchRowHandler,
                sheet=capture_batch_sheet,
                row_i=row_id,
                protocol=self.preloaded_data['protocol'],
                process_properties=copy.deepcopy(process_properties),
                capture_type=str_cast_and_normalize(capture_batch_dict['Capture Type']),
                comment=str_cast_and_normalize(capture_batch_dict['Comment']),
                imported_template=self.imported_file
            )

            if any(capture_batch_sheet.rows[row_id]): # Add the data only if the row is not empty
                capture_batch_info = dict(
                    # Library attributes data dictionary and related objects
                    capture_date=input_to_date_and_none(capture_batch_dict['Capture Date (YYYY-MM-DD)']),
                    # library selection
                    **batch_objects,
                    # Additional data for this row
                    protocol=self.preloaded_data['protocol'],
                )

                if capture_batch_dict['Capture Batch ID']:
                    capture_batch_rows_data[capture_batch_dict['Capture Batch ID']] = capture_batch_info

        """
            LIBRARIES SHEET
        """
        libraries_sheet = self.sheets['Library']
        for i, row_data in enumerate(libraries_sheet.rows):
            capture_preparation_kwargs = {
                'capture_batch_info': capture_batch_rows_data[row_data['Capture Batch ID']],
                'source_sample':
                    {'barcode': str_cast_and_normalize(row_data['Source Container Barcode']),
                     'coordinates': str_cast_and_normalize(row_data['Source Container Coordinates']),
                     },
                'volume_used': load_all_or_float_to_decimal_and_none(row_data['Source Volume Used (uL)']),
                'comment': str_cast_and_normalize(row_data['Comment']),
                'container':
                    {'barcode': str_cast_and_normalize(row_data['Destination Container Barcode']),
                     'coordinates': str_cast_and_normalize(row_data['Destination Container Coordinates']),
                     'name': str_cast_and_normalize(row_data['Destination Container Name']),
                     'kind': str_cast_and_normalize_lower(row_data['Destination Container Kind']),
                     'parent_barcode': str_cast_and_normalize(row_data['Destination Parent Container Barcode']),
                     'parent_coordinates': str_cast_and_normalize(row_data['Destination Parent Container Coordinates'])
                     },
                'volume': float_to_decimal_and_none(row_data['Destination Volume (uL)']),
                'workflow':
                    {'step_action': str_cast_and_normalize(row_data['Workflow Action']),
                     'step': step_by_row_id[i]
                    },
                 }

            (result, _) = self.handle_row(
                row_handler_class=LibraryRowHandler,
                sheet=libraries_sheet,
                row_i=i,
                **capture_preparation_kwargs,
            )

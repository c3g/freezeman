from fms_core.models import PropertyType, Protocol
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.library_preparation import LibraryPreparationRowHandler, LibraryRowHandler
from fms_core.templates import LIBRARY_PREPARATION_TEMPLATE
from collections import defaultdict
from .._utils import float_to_decimal_and_none, input_to_date_and_none

PROPERTIES_STARTING_INDEX = 5

class LibraryPreparationImporter(GenericImporter):
    SHEETS_INFO = LIBRARY_PREPARATION_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX

    def initialize_data_for_template(self):
        # Get protocol for Library Preparation
        protocol = Protocol.objects.get(name='Library Preparation')

        self.preloaded_data = {'protocol': protocol, 'process_properties': {}}

        # Preload PropertyType objects for this protocol in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = \
                {o.name: {'property_type_obj': o} for o in list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

    def import_template_inner(self):
        """
            LIBRARIES SHEET
        """
        libraries_sheet = self.sheets['Library']
        libraries_rows_data = defaultdict(list)
        for i, row_data in enumerate(libraries_sheet.rows):
            library = {'library_batch_id': row_data['Library Batch ID'],
                       'volume_used': float_to_decimal_and_none(row_data['Sample Volume Used (uL)']),
                       'comment': row_data['Comment'],
                       'container':
                           {'barcode': row_data['Library Container Barcode'],
                            'coordinates': row_data['Library Container Coordinates'],
                            'name': row_data['Library Container Name'],
                            'kind': row_data['Library Container Kind'],
                            'parent_barcode': row_data['Library Parent Container Barcode'],
                            'parent_coordinates': row_data['Library Container Coordinates']
                            },
                       'volume': float_to_decimal_and_none(row_data['Library Volume (uL)']),
                       'index': row_data['Index'],
                      }

            sample_kwargs = dict(
                barcode=row_data['Sample Container Barcode'],
                coordinates=row_data['Sample Container Coordinates'],
                volume_used=library['volume_used']
            )

            (result, library['sample_obj']) = self.handle_row(
                row_handler_class=LibraryRowHandler,
                sheet=libraries_sheet,
                row_i=i,
                **sample_kwargs,
            )

            libraries_rows_data[library['library_batch_id']].append(library)

        """
            LIBRARY BATCH SHEET
        """
        library_batch_sheet = self.sheets['Library Batch']

        # Iterate through libraries rows
        for row_id, row in enumerate(library_batch_sheet.rows):
            library_batch_dict = {}
            process_properties = self.preloaded_data['process_properties']
            for i, (key, val) in enumerate(row.items()):
                if i < self.properties_starting_index:
                    library_batch_dict[key] = row[key]
                else:
                    process_properties[key]['value'] = val

            library_preparation_kwargs = dict(
                # Library attributes data dictionary and related objects
                library_batch_id=library_batch_dict['Library Batch ID'],
                library_type={'name' : library_batch_dict['Experiment Type']},
                # TODO: Verify with lab if this is correct
                library_size=process_properties['Shearing Size (bp)']['value'],
                library_date=input_to_date_and_none(library_batch_dict['Library Date (YYYY-MM-DD)']),
                platform={'name': library_batch_dict['Platform']},
                comment=library_batch_dict['Comment'],
                # Additional data for this row
                protocol=self.preloaded_data['protocol'],
                process_properties=process_properties,
                library_rows_info=libraries_rows_data[library_batch_dict['Library Batch ID']],
            )

            (result, _) = self.handle_row(
                row_handler_class=LibraryPreparationRowHandler,
                sheet=library_batch_sheet,
                row_i=row_id,
                **library_preparation_kwargs,
            )
import copy

from fms_core.models import PropertyType, Protocol, Process
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.library_preparation import LibraryRowHandler, LibraryBatchRowHandler
from fms_core.templates import SAMPLE_POOLING_TEMPLATE
from collections import defaultdict
from .._utils import float_to_decimal_and_none, input_to_date_and_none
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower

class LibraryPreparationImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_POOLING_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        self.preloaded_data = {'protocol': Protocol.objects.get(name='Sample Pooling')}

    def import_template_inner(self):
        pools_dict = {}
        """
            SamplesToPool SHEET
        """
        samplestopool_sheet = self.sheets['SamplesToPool']
        for i, row_data in enumerate(samplestopool_sheet.rows):
            samplestopool_kwargs = {
                'source_sample':
                    {'barcode': str_cast_and_normalize(row_data['Source Container Barcode']),
                     'coordinates': str_cast_and_normalize(row_data['Source Container Coordinates']),
                     'depleted': str_cast_and_normalize(row_data['Source Depleted']),
                     },
                'volume_used': float_to_decimal_and_none(row_data['Volume Used (uL)']),
                'comment': str_cast_and_normalize(row_data['Comment']),
            }

            (result, row_object) = self.handle_row(
                row_handler_class=SamplesToPoolRowHandler,
                sheet=samplestopool_sheet,
                row_i=i,
                **samplestopool_kwargs,
            )
            pools_dict[str_cast_and_normalize(row_data['Pool Name'])].append(row_object)

        """
            POOLS SHEET
        """
        pools_sheet = self.sheets['Pools']

        # Iterate through libraries rows
        pools_rows_data = defaultdict(list)
        for row_id, row_data in enumerate(pools_sheet.rows):
            pools_kwargs = {
                'coordinates': str_cast_and_normalize(row_data['Destination Container Coord']),
                'pooling date': input_to_date_and_none(row_data['Pooling Date (YYYY-MM-DD)']),
                'comment': str_cast_and_normalize(row_data['Comment']),
                'container': {
                    'barcode': str_cast_and_normalize(row_data['Destination Container Barcode']),
                    'name': str_cast_and_normalize(row_data['Destination Container Name']),
                    'kind': str_cast_and_normalize_lower(row_data['Destination Container Kind']),
                    'coordinates': str_cast_and_normalize(row_data['Destination Parent Container Coord']),
                    'parent_barcode': str_cast_and_normalize(row_data['Destination Parent Container Barcode']),
                },
            }

            (result, _) = self.handle_row(
                row_handler_class=PoolsRowHandler,
                sheet=pools_sheet,
                row_i=row_id,
                protocol=self.preloaded_data['protocol'],
                imported_template=self.imported_file,
                samples_info=pools_dict[str_cast_and_normalize(row_data['Pool Name'])],
                **pools_kwargs
            )

        


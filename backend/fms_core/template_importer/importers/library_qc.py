import copy
from fms_core.template_importer.row_handlers.library_qc.library import LibraryQCRowHandler

from fms_core.models import PropertyType, Protocol, Process
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.library_preparation import LibraryRowHandler, LibraryBatchRowHandler
from fms_core.templates import LIBRARY_QC_TEMPLATE
from collections import defaultdict
from .._utils import float_to_decimal_and_none, input_to_date_and_none

PROPERTIES_STARTING_INDEX = 5

class LibraryQCImporter(GenericImporter):
    SHEETS_INFO = LIBRARY_QC_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX

    def import_template_inner(self):
        libraries_sheet = self.sheets['LibraryQC']
        for i, row_data in enumerate(libraries_sheet.rows):

            container = {
                'container_barcode': row_data['Library Container Barcode'],
                'container_coord': row_data['Libary Container Coord']
            }

            measures = {
                'initial_volume': float_to_decimal_and_none(row_data['Initial Volume (uL)']),
                'measured_volume': float_to_decimal_and_none(row_data['Measured Volume (uL)']),
                'volume_used': float_to_decimal_and_none(row_data['Volume Used (uL)']),
                'concentration_nm': float_to_decimal_and_none(row_data['Concentration (nM)']),
                'concentration_uL' : float_to_decimal_and_none(row_data['Concentration (ng/uL)'])
            }

            quality = {
                'quality_instrument': row_data['Quality Instrument'],
                'quality_flag': row_data['Quality Flag'],
                'quantity_instrument': row_data['Quantity Instrument'],
                'quantity_flag': row_data['Quantity Flag'],
                'qc_date': input_to_date_and_none(row_data['QC Date (YYYY-MM-DD)']),
                'comment': row_data['Comment']
            }

            library_qc_kwargs = {
                'container': container,
                'measures': measures,
                'quality': quality
            }

            (result, _) = self.handle_row(
                row_handler_class=LibraryQCRowHandler,
                sheet=libraries_sheet,
                row_i=i,
                **library_qc_kwargs,
           )


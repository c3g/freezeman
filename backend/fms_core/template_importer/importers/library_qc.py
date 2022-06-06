import copy
from fms_core.template_importer.row_handlers.library_qc.library import LibraryQCRowHandler

from fms_core.models import PropertyType, Protocol, Process
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.library_preparation import LibraryRowHandler, LibraryBatchRowHandler
from fms_core.templates import LIBRARY_QC_TEMPLATE
from collections import defaultdict
from .._utils import float_to_decimal_and_none, input_to_date_and_none

PROPERTIES_STARTING_INDEX = 5 #TODO verify that this index is correct

class LibraryQCImporter(GenericImporter):
    SHEETS_INFO = LIBRARY_QC_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        #Get protocol for SampleQC
        protocol = Protocol.objects.get(name='Library Quality Control')

         #Preload data
        self.preloaded_data = {'process': None, 'process_properties': {}}

        self.preloaded_data['process'] = Process.objects.create(protocol=protocol,
                                                                comment='Library Quality Control (imported from template)')

        # Preload PropertyType objects for the sample qc in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = { property.name: {'property_type_obj': property } for property in
                                                         list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f'Property Type could not be found. {e}')


    def import_template_inner(self):
        libraries_sheet = self.sheets['LibraryQC']
        for i, row_data in enumerate(libraries_sheet.rows):

            process_measurement_properties = self.preloaded_data['process_properties']

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

            qc = {
                'quality_instrument': row_data['Quality Instrument'],
                'quality_flag': row_data['Quality Flag'],
                'quantity_instrument': row_data['Quantity Instrument'],
                'quantity_flag': row_data['Quantity Flag'],
                'qc_date': input_to_date_and_none(row_data['QC Date (YYYY-MM-DD)']),
                'comment': row_data['Comment']
            }

            library_qc_kwargs = dict(
                container = container,
                measures = measures,
                qc = qc,
                process = self.preloaded_data['process'],
                process_measurement_properties = process_measurement_properties,
            )

            (result, _) = self.handle_row(
                row_handler_class=LibraryQCRowHandler,
                sheet=libraries_sheet,
                row_i=i,
                **library_qc_kwargs,
           )


import copy
from collections import defaultdict

from .._utils import float_to_decimal_and_none, input_to_date_and_none
from fms_core.utils import str_cast_and_normalize
from fms_core.models import PropertyType, Protocol, Process
from ._generic import GenericImporter
from fms_core.templates import LIBRARY_QC_TEMPLATE
from fms_core.template_importer.row_handlers.library_preparation import LibraryRowHandler, LibraryBatchRowHandler
from fms_core.template_importer.row_handlers.library_qc.library_qc import LibraryQCRowHandler


PROPERTIES_STARTING_INDEX = 5 #TODO verify that this index is correct

class LibraryQCImporter(GenericImporter):
    SHEETS_INFO = LIBRARY_QC_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        #Get protocol for SampleQC, which is used for samples and libraries
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

        # Add the template to the process
        if self.imported_file is not None:
            self.preloaded_data['process'].imported_template_id = self.imported_file.id
            self.preloaded_data['process'].save()

        for row_id, row_data in enumerate(libraries_sheet.rows):

            process_measurement_properties = self.preloaded_data['process_properties']
            # Make sure every property has a value property, even if it is not used.
            # Otherwise create_process_measurement_properties will raise an exception when
            # it tries to get the value for a property.
            for property in process_measurement_properties.values():
                property['value'] = None

            sample_container = {
                'container_barcode': str_cast_and_normalize(row_data['Library Container Barcode']),
                'container_coord': str_cast_and_normalize(row_data['Library Container Coord'])
            }

            measures = {
                'initial_volume': float_to_decimal_and_none(row_data['Initial Volume (uL)']),
                'measured_volume': float_to_decimal_and_none(row_data['Measured Volume (uL)']),
                'concentration_nm': float_to_decimal_and_none(row_data['Concentration (nM)']),
                'concentration_uL' : float_to_decimal_and_none(row_data['Concentration (ng/uL)']),
                'library_size': float_to_decimal_and_none(row_data['Library size (bp)'], 0),
                'quality_instrument': str_cast_and_normalize(row_data['Quality Instrument']),
                'quality_flag': str_cast_and_normalize(row_data['Quality Flag']),
                'quantity_instrument': str_cast_and_normalize(row_data['Quantity Instrument']),
                'quantity_flag': str_cast_and_normalize(row_data['Quantity Flag'])
            }

            process_measurement = {
                'execution_date': input_to_date_and_none(row_data['QC Date (YYYY-MM-DD)']),
                'volume_used': float_to_decimal_and_none(row_data['Volume Used (uL)']),
                'comment': str_cast_and_normalize(row_data['Comment']),
            }

            library_qc_kwargs = dict(
                sample_container = sample_container,
                measures = measures,
                process = self.preloaded_data['process'],
                process_measurement = process_measurement,
                process_measurement_properties = process_measurement_properties,
            )

            (result, _) = self.handle_row(
                row_handler_class=LibraryQCRowHandler,
                sheet=libraries_sheet,
                row_i=row_id,
                **library_qc_kwargs,
           )


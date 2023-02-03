from fms_core.models import Process, Protocol, PropertyType

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_qc import SampleQCRowHandler
from fms_core.templates import SAMPLE_QC_TEMPLATE
from fms_core.services.step import get_step_from_template
from .._utils import float_to_decimal_and_none, input_to_date_and_none
from fms_core.utils import str_cast_and_normalize

# {{TEMPLATE PROPERTY NAME : DB PROPERTY NAME}
TEMPLATE_PROPERTY_MAPPING = {
    "Quality Flag": "Sample Quality QC Flag",
    "Quantity Flag": "Sample Quantity QC Flag",
    "Measured Volume (uL)": "Measured Volume (uL)",
    "Concentration (ng/uL)": "Concentration (ng/uL)",
    "RIN (for RNA only)": "RIN",
    "Quality Instrument": "Quality Instrument",
    "Quantity Instrument": "Quantity Instrument",
}

class SampleQCImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_QC_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        #Get protocol for SampleQC
        protocol = Protocol.objects.get(name='Sample Quality Control')

        #Preload data
        self.preloaded_data = {'process': None, 'protocol': protocol, 'process_properties': {}}

        self.preloaded_data['process'] = Process.objects.create(protocol=protocol,
                                                                comment='Sample Quality Control (imported from template)')

        # Preload PropertyType objects for the sample qc in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = { property.name: {'property_type_obj': property } for property in
                                                         list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f'Property Type could not be found. {e}')

    def import_template_inner(self):
        sample_qc_sheet = self.sheets['SampleQC']

        # Identify for each row of the matching workflow step
        step_by_row_id, errors, warnings = get_step_from_template(self.preloaded_data['protocol'], self.sheets, self.SHEETS_INFO)
        self.base_errors.extend(errors)

        # Add the template to the process
        if self.imported_file is not None:
            self.preloaded_data['process'].imported_template_id = self.imported_file.id
            self.preloaded_data['process'].save()

        for row_id, row_data in enumerate(sample_qc_sheet.rows):
            process_measurement_properties = self.preloaded_data['process_properties']

            #Populate process properties
            for i, (key, val) in enumerate(row_data.items()):
                if key in TEMPLATE_PROPERTY_MAPPING.keys():
                    process_measurement_properties[TEMPLATE_PROPERTY_MAPPING[key]]['value'] = val

            sample = {
                'coordinates': str_cast_and_normalize(row_data['Sample Container Coord']),
                'container': {'barcode': str_cast_and_normalize(row_data['Sample Container Barcode'])}
            }
            sample_information = {
                'initial_volume': float_to_decimal_and_none(row_data['Initial Volume (uL)']),
                'measured_volume': float_to_decimal_and_none(row_data['Measured Volume (uL)']),
                'concentration': float_to_decimal_and_none(row_data['Concentration (ng/uL)']),
                'quantity_flag': str_cast_and_normalize(row_data['Quantity Flag']),
                'quality_flag': str_cast_and_normalize(row_data['Quality Flag'])
            }

            process_measurement = {
                'process': self.preloaded_data['process'],
                'execution_date': input_to_date_and_none(row_data['QC Date']),
                'volume_used': float_to_decimal_and_none(row_data['Volume Used (uL)']),
                'comment': str_cast_and_normalize(row_data['Comment']),
            }

            workflow = {
                'step_action': str_cast_and_normalize(row_data['Workflow Action']),
                'step': step_by_row_id[row_id]
            }

            sample_qc_kwargs = dict(
                sample=sample,
                sample_information=sample_information,
                process_measurement=process_measurement,
                process_measurement_properties=process_measurement_properties,
                workflow=workflow,
            )

            (result, _) = self.handle_row(
                row_handler_class=SampleQCRowHandler,
                sheet=sample_qc_sheet,
                row_i=row_id,
                **sample_qc_kwargs,
            )

from fms_core.models import Process, Protocol, PropertyType

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_selection_qpcr import SampleSelectionQPCRRowHandler
from fms_core.templates import SAMPLE_SELECTION_QPCR_TEMPLATE
from .._utils import float_to_decimal_and_none, input_to_date_and_none

# {{TEMPLATE PROPERTY NAME : DB PROPERTY NAME}
TEMPLATE_PROPERTY_MAPPING = {
    "qPCR Type": "qPCR Type",
    "CT Value (Experimental)": "CT Value (Experimental)",
    "CT Value (Control)": "CT Value (Control)",
    "Status": "qPCR Status",
}

class SampleSelectionQPCRImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_SELECTION_QPCR_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        #Get protocol for SampleSelectinoQPCR
        protocol = Protocol.objects.get(name='Sample Selection using qPCR')

        #Preload data
        self.preloaded_data = {'process': None, 'process_properties': {}}

        self.preloaded_data['process'] = Process.objects.create(protocol=protocol,
                                                                comment='Sample Selection using qPCR (imported from template)')

        # Preload PropertyType objects for the sample qc in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = { property.name: {'property_type_obj': property } for property in
                                                         list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f'Property Type could not be found. {e}')

    def import_template_inner(self):
        sample_qpcr_sheet = self.sheets['Samples']

        for row_id, row_data in enumerate(sample_qpcr_sheet.rows):
            process_measurement_properties = self.preloaded_data['process_properties']

            #Populate process properties
            for i, (key, val) in enumerate(row_data.items()):
                if key in TEMPLATE_PROPERTY_MAPPING.keys():
                    process_measurement_properties[TEMPLATE_PROPERTY_MAPPING[key]]['value'] = val

            sample = {
                'coordinates': row_data['Sample Container Coord'],
                'container': {'barcode': row_data['Sample Container Barcode']},
                'depleted': row_data['Source Depleted'],
            }
            sample_information = {
                'qpcr_type': row_data['qPCR Type'],
                'ct_value_experimental': float_to_decimal_and_none(row_data['CT Value (Experimental)']),
                'ct_value_control': float_to_decimal_and_none(row_data['CT Value (Experimental)']),
                'qpcr_status': row_data['Status'],
            }

            process_measurement = {
                'process': self.preloaded_data['process'],
                'execution_date': input_to_date_and_none(row_data['qPCR Date']),
                'volume_used': float_to_decimal_and_none(row_data['Volume Used (uL)']),
                'comment': row_data['Comment'],
            }

            sample_selection_qpcr_kwargs = dict(
                sample=sample,
                sample_information=sample_information,
                process_measurement=process_measurement,
                process_measurement_properties=process_measurement_properties,
            )

            (result, _) = self.handle_row(
                row_handler_class=SampleSelectionQPCRRowHandler,
                sheet=sample_qpcr_sheet,
                row_i=row_id,
                **sample_selection_qpcr_kwargs,
            )

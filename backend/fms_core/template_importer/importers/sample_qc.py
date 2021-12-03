from fms_core.models import Process, Protocol, PropertyType

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_qc import SampleQCRowHandler

from .._utils import float_to_decimal_and_none, input_to_date_and_none

# {{TEMPLATE PROPERTY NAME : DB PROPERTY NAME}
TEMPLATE_PROPERTY_MAPPING = {
    "Measured Volume (uL)": "Measured Volume",
    "Concentration (ng/uL)": "Concentration",
    "RIN (for RNA only)": "RIN",
    "Electrophoresis Instrument": "Electrophoresis Instrument",
    "Quantitation Instrument": "Quantitation Instrument",
    "Comment": "Comment"
}

class SampleQCImporter(GenericImporter):
    SHEETS_INFO = [
        {
            'name': 'SampleQC',
            'headers': ['Sample Container Barcode', 'Sample Container Coord', 'Initial Volume (uL)',
                        'Measured Volume (uL)', 'Volume Used (uL)', 'Concentration (ng/uL)', 'NA Quantity (ng)',
                        'RIN (for RNA only)', 'Electrophoresis Instrument', 'Quality Flag', 'Quantitation Instrument',
                        'Quantity Flag', 'QC Date', 'Comment']
        },
    ]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        #Get protocol for SampleQC
        protocol = Protocol.objects.get(name='Sample Quality Control')

        #Preload data
        self.preloaded_data = {'process': None, 'process_properties': {}}

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

        for row_id, row_data in enumerate(sample_qc_sheet.rows):
            process_measurement_properties = self.preloaded_data['process_properties']

            #Populate process properties
            for i, (key, val) in enumerate(row_data.items()):
                if key in TEMPLATE_PROPERTY_MAPPING.keys():
                    process_measurement_properties[TEMPLATE_PROPERTY_MAPPING[key]]['value'] = val

            sample = {
                'coordinates': row_data['Sample Container Coord'],
                'container': {'barcode': row_data['Sample Container Barcode']}
            }
            sample_information = {
                'initial_volume': float_to_decimal_and_none(row_data['Initial Volume (uL)']),
                'measured_volume': float_to_decimal_and_none(row_data['Measured Volume (uL)']),
                'concentration': float_to_decimal_and_none(row_data['Concentration (ng/uL)']),
                'quantity_flag': row_data['Quantity Flag'],
                'quality_flag': row_data['Quality Flag']
            }

            process_measurement = {
                'process': self.preloaded_data['process'],
                'execution_date': input_to_date_and_none(row_data['QC Date']),
                'volume_used': float_to_decimal_and_none(row_data['Volume Used (uL)']),
                'comment': row_data['Comment'],
            }

            sample_qc_kwargs = dict(
                sample=sample,
                sample_information=sample_information,
                process_measurement=process_measurement,
                process_measurement_properties=process_measurement_properties,
            )

            (result, _) = self.handle_row(
                row_handler_class=SampleQCRowHandler,
                sheet=sample_qc_sheet,
                row_i=row_id,
                **sample_qc_kwargs,
            )

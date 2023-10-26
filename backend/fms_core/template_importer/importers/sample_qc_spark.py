from io import StringIO
import os
from typing import TypedDict
from fms_core.models import Process, Protocol, PropertyType, Step

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_qc_spark import SampleQCSparkRowHandler
from fms_core.templates import SAMPLE_QC_SPARK_TEMPLATE
from fms_core.services.step import get_step_from_template
from .._utils import float_to_decimal_and_none, input_to_date_and_none, zero_pad_number
from fms_core.utils import str_cast_and_normalize
from fms_core._constants import WorkflowAction

SampleQCSparkSheet = TypedDict('SampleQCSparkSheet', {
    'Well positions': str,
    '260nm': str,
    '280nm': str,
    '320nm': str,
    'Concentration ug/ul': str,
    'Purity 260/280': str,
    'Mass/rxn (ug)': str
})

class SampleSparkQCImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_QC_SPARK_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()
    
    def preprocess_file(self, path: os.PathLike) -> StringIO:
        new_content = StringIO()

        with open(path) as original:
            for line in original:
                if line.startswith("Date of measurement"):
                    break
                new_content.write(line.strip())
                new_content.write('\n')
            for line in original:
                if line.startswith("Plate ID: "):
                    self.preloaded_data['plate_barcode'] = line[len("Plate ID: "):].strip()
                    break
            for line in original:
                date_key = "Date: "
                if line.startswith(date_key):
                    self.preloaded_data["execution_date"] = line[len(date_key):len(date_key)+10].strip()

        return new_content

    def initialize_data_for_template(self):
        #Get protocol for SampleQCSpark
        protocol = Protocol.objects.get(name='Sample Quality Control Spark')

        #Preload data
        self.preloaded_data = {'process': None, 'protocol': protocol, 'process_properties': {}, 'plate_barcode': None}

        self.preloaded_data['process'] = Process.objects.create(protocol=protocol,
                                                                comment='Sample Quality Control (imported from Spark QC result file)')

        # Preload PropertyType objects for the sample qc in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = { property.name: {'property_type_obj': property } for property in
                                                         list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f'Property Type could not be found. {e}')

    def import_template_inner(self):
        spark_sample_qc_sheet = self.sheets['SampleQCSpark']

        # TODO: handle None?
        candidate_step = Step.objects.filter(protocol=self.preloaded_data['protocol']).first()

        # Add the template to the process
        if self.imported_file is not None:
            self.preloaded_data['process'].imported_template_id = self.imported_file.id
            self.preloaded_data['process'].save()

        for row_id, row_data in enumerate(spark_sample_qc_sheet.rows):
            row_data: SampleQCSparkSheet = row_data
            process_measurement_properties = self.preloaded_data['process_properties']

            quantity_flag = str_cast_and_normalize(row_data['Mass/rxn (ug)'] > 1000)

            process_measurement_properties['Sample Quantity QC Flag']['value'] = quantity_flag

            sample = {
                'coordinates': str_cast_and_normalize(row_data['Well positions'][0] + zero_pad_number(row_data['Well positions'][1:], 2)),
                'container': {'barcode': self.preloaded_data['plate_barcode']}
            }

            sample_information = {
                'quantity_flag': quantity_flag,
            }

            process_measurement = {
                'process': self.preloaded_data['process'],
                'execution_date': input_to_date_and_none(self.preloaded_data["execution_date"]),
                'comment': 'Axiom Sample QC workflow step (based on Sample absorbance QC Tecan-Spark)',
            }

            workflow = {
                'step_action': WorkflowAction.NEXT_STEP.label,
                'step': candidate_step
            }

            sample_spark_qc_kwargs = dict(
                sample=sample,
                sample_information=sample_information,
                process_measurement=process_measurement,
                process_measurement_properties=process_measurement_properties,
                workflow=workflow,
            )

            (result, _) = self.handle_row(
                row_handler_class=SampleQCSparkRowHandler,
                sheet=spark_sample_qc_sheet,
                row_i=row_id,
                **sample_spark_qc_kwargs,
            )

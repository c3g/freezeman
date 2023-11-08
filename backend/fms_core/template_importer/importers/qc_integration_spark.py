from io import StringIO
import os
from typing import TypedDict
from django.core.files.uploadedfile import InMemoryUploadedFile

from fms_core.models import Process, Protocol, PropertyType, Step

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.qc_integration_spark import QCIntegrationSparkRowHandler
from fms_core.templates import QUALITY_CONTROL_INTEGRATION_SPARK_TEMPLATE
from .._utils import float_to_decimal_and_none, input_to_date_and_none, zero_pad_number
from fms_core.utils import str_cast_and_normalize
from fms_core._constants import WorkflowAction

QCSparkSheet = TypedDict('QCSparkSheet', {
    'Instrument': str,
    'Well positions': str,
    '260nm': str,
    '280nm': str,
    '320nm': str,
    'Concentration ug/ul': str,
    'Purity 260/280': str,
    'Mass/rxn (ug)': str
})

class QCIntegrationSparkImporter(GenericImporter):
    INSTRUMENT_TYPE = "Spark 10M"
    SHEETS_INFO = QUALITY_CONTROL_INTEGRATION_SPARK_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()
    
    def preprocess_file(self, path: os.PathLike) -> StringIO:
        new_content = StringIO()
        if isinstance(path, InMemoryUploadedFile):
            original = path.open()
            lines = list(filter(None, [line.decode(encoding="utf-8", errors="ignore").strip() for line in original.readlines()]))
        else:
            original = path.open(encoding='utf-8', errors='ignore')
            lines = list(filter(None, [line.strip() for line in original.readlines()]))
        # Add Instrument to header
        new_content.write("Instrument," + lines[0].strip()[:-1] + "\n")
        has_reached_cutoff = False
        DATE_KEY = "Date of measurement: "
        PLATE_KEY = "Plate ID: "
        for line in lines[1:]:
            if line.startswith(DATE_KEY):
                has_reached_cutoff = True
                self.preloaded_data["execution_date"] = line[len(DATE_KEY):len(DATE_KEY)+10]
            if line.startswith(PLATE_KEY):
                self.preloaded_data['plate_barcode'] = line[len(PLATE_KEY):]

            if not has_reached_cutoff:
                new_content.write(self.INSTRUMENT_TYPE + "," + line.strip()[:-1] + "\n")
        new_content.seek(0)
        return new_content

    def initialize_data_for_template(self):
        #Get protocol for SampleQCSpark
        protocol = Protocol.objects.get(name='Quality Control - Integration')
        step = Step.objects.get(name='Quality Control - Integration (Spark)')

        #Preload data
        self.preloaded_data = {'process': None, 'protocol': protocol, 'step': step, 'process_properties': {}, 'plate_barcode': None}

        self.preloaded_data['process'] = Process.objects.create(protocol=protocol,
                                                                comment='Quality Control Integration (imported from Spark QC result file).')

        # Preload PropertyType objects for the sample qc in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = { property.name: {'property_type_obj': property } for property in
                                                         list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f'Property Type could not be found. {e}')

    def import_template_inner(self):
        spark_qc_sheet = self.sheets['Default']

        # Add the template to the process
        if self.imported_file is not None:
            self.preloaded_data['process'].imported_template_id = self.imported_file.id
            self.preloaded_data['process'].save()

        for row_id, row_data in enumerate(spark_qc_sheet.rows):
            row_data: QCSparkSheet = row_data
            process_measurement_properties = self.preloaded_data['process_properties']

            mass = float_to_decimal_and_none(row_data['Mass/rxn (ug)'])
            if mass and mass > 1000:
                quantity_flag = "Passed"
            else:
                quantity_flag = "Failed"

            # Populate properties
            process_measurement_properties['Quantity QC Flag']['value'] = quantity_flag
            process_measurement_properties['Quantity Instrument']['value'] = self.INSTRUMENT_TYPE
            process_measurement_properties['Mass/rxn (ug)']['value'] = str_cast_and_normalize(mass)

            sample = {
                'coordinates': str_cast_and_normalize(row_data['Well positions'][0] + zero_pad_number(row_data['Well positions'][1:], 2)),
                'container': {'barcode': str_cast_and_normalize(self.preloaded_data['plate_barcode'])}
            }

            sample_information = {
                'quantity_flag': quantity_flag,
            }

            process_measurement = {
                'process': self.preloaded_data['process'],
                'volume_used': float_to_decimal_and_none("5"), # Default value used for QC
                'execution_date': input_to_date_and_none(self.preloaded_data["execution_date"]),
                'comment': 'Quality Control - Integration workflow step (based on Tecan-Spark absorbance QC)',
            }

            workflow = {
                'step_action': WorkflowAction.NEXT_STEP.label,
                'step': self.preloaded_data['step']
            }

            sample_spark_qc_kwargs = dict(
                sample=sample,
                sample_information=sample_information,
                process_measurement=process_measurement,
                process_measurement_properties=process_measurement_properties,
                workflow=workflow,
            )

            (result, _) = self.handle_row(
                row_handler_class=QCIntegrationSparkRowHandler,
                sheet=spark_qc_sheet,
                row_i=row_id,
                **sample_spark_qc_kwargs,
            )

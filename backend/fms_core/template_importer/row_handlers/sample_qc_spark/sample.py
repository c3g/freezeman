import datetime
from typing import TypedDict

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container, update_sample
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.property_value import create_process_measurement_properties
from fms_core.services.sample import update_qc_flags
from fms_core.services.sample_next_step import execute_workflow_action
from fms_core.models import InstrumentType, Process, Step

INSTRUMENT_PROPERTIES = ['Quantity Instrument']
QC_PLATFORM = "Quality Control"

WorkflowDict = TypedDict('WorkflowDict', {
    'step_action': str,
    'step': Step
})

class SampleQCSparkRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self,
                          sample,
                          sample_information,
                          process_measurement,
                          process_measurement_properties,
                          workflow: WorkflowDict):
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=sample['container']['barcode'],
            coordinates=sample['coordinates'],
        )

        if sample_obj:
            # Check if sample is not a library or a pool of libraries
            if sample_obj.is_library:
                self.errors['source_sample'] = f"Source sample can't be a library or a pool of libraries."

            # Update the sample's flags with sample information
            _, self.errors['flags'], self.warnings['flags'] = update_qc_flags(sample=sample_obj,
                                                                              quantity_flag=sample_information['quantity_flag'],
                                                                              quality_flag=sample_information['quality_flag'])

            process_measurement_obj, self.errors['process_measurement'], self.warnings['process_measurement'] = \
                create_process_measurement(
                    process=process_measurement['process'],
                    source_sample=sample_obj,
                    execution_date=process_measurement['execution_date'],
                    volume_used=process_measurement['volume_used'],
                    comment=process_measurement['comment'],
                )

            # Create process measurement's properties
            if process_measurement_obj:
                properties_obj, self.errors['properties'], self.warnings['properties'] = create_process_measurement_properties(
                    process_measurement_properties,
                    process_measurement_obj)

                # Process the workflow action
                self.errors['workflow'], self.warnings['workflow'] = execute_workflow_action(workflow_action=workflow["step_action"],
                                                                                             step=workflow["step"],
                                                                                             current_sample=sample_obj,
                                                                                             process_measurement=process_measurement_obj)

            if process_measurement_obj and properties_obj:
                # Validate instruments according to platform
                for instrument in INSTRUMENT_PROPERTIES:
                    try:
                        type = process_measurement_properties[instrument]['value']
                        it = InstrumentType.objects.get(type=type)
                        # Validate platform and type
                        if it.platform.name != QC_PLATFORM:
                            self.errors['instrument_type'] = f'Invalid type: {it.platform} for instrument: {it.type}.'
                    except Exception as e:
                        self.errors['instrument'] = f'Invalid instrument {type}.'

                # Validate required RIN for RNA
                if sample_obj.derived_samples.first().sample_kind.name == 'RNA' and process_measurement_properties['RIN']['value'] is None:
                    self.errors['RIN'] = 'RIN has to be specified for RNA.'



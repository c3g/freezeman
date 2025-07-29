from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.services.sample import get_sample_from_container, update_sample, update_qc_flags, WorkflowAction
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.sample_next_step import execute_workflow_action

class SampleIdentityQCRowHandler(GenericRowHandler):

    def process_row_inner(self, sample, process_measurement, workflow):
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=sample['container']['barcode'],
            coordinates=sample['coordinates'],
        )

        if sample_obj:
            # Check if sample is not a library or a pool of libraries
            if sample_obj.is_pool:
                self.errors['sample'] = f"Sample identity QC can't be performed on a pool of libraries."

            # Update sample with sample_information
            new_volume = None
            volume_used = process_measurement.get('volume_used', None)
            if volume_used is not None:
                new_volume = sample_obj.volume - volume_used
            else:
                self.errors['volume'] = 'Volume Used is required.'

             # Return if there are any validation errors
            if any(self.errors.values()):
                return

            _, self.errors['sample_update'], self.warnings['sample_update'] = \
                update_sample(sample_to_update=sample_obj, volume=new_volume)

            # Update the sample's identity flag according to the step action chosen
            step_action = workflow.get("step_action", None)
            if step_action is None or step_action == WorkflowAction.NEXT_STEP.label:
                identity_flag = "Passed"
            elif step_action == WorkflowAction.DEQUEUE_SAMPLE.label:
                identity_flag = "Failed"
            else:
                identity_flag = None

            if identity_flag is not None:
                _, self.errors['flags'], self.warnings['flags'] = update_qc_flags(sample=sample_obj, identity_flag=identity_flag)

            process_measurement_obj, self.errors['process_measurement'], self.warnings['process_measurement'] = \
                create_process_measurement(
                    process=process_measurement['process'],
                    source_sample=sample_obj,
                    execution_date=process_measurement['execution_date'],
                    volume_used=volume_used,
                    comment=process_measurement['comment'],
                )

            
            if process_measurement_obj:
                # Process the workflow action
                self.errors['workflow'], self.warnings['workflow'] = execute_workflow_action(workflow_action=workflow["step_action"],
                                                                                             step=workflow["step"],
                                                                                             current_sample=sample_obj,
                                                                                             process_measurement=process_measurement_obj)

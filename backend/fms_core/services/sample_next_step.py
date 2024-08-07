from django.core.exceptions import ValidationError
from django.db.models import Case, When, Q, F, BooleanField
from fms_core.models import SampleNextStep, SampleNextStepByStudy, StepOrder, Sample, Study, Step, ProcessMeasurement, StepHistory
from fms_core._constants import WorkflowAction
from typing import  List, Tuple, Union
from fms_core.models._constants import SampleType

def queue_sample_to_study_workflow(sample_obj: Sample, study_obj: Study, order: int=None) -> Tuple[Union[SampleNextStep, None], List[str], List[str]]:
    """
    Create a SampleNextStepByStudy instance to indicate the position of a sample in a study workflow. Also creates a SampleNextStep instance if none exists.
    The order of insertion defaults to the start order of the study workflow.

    Args:
        `sample_obj`: Sample instance to queue to the study workflow.
        `study_obj`: Study instance that will be associated to the sample.
        `order`: Positive integer indicating the insertion order of the sample in the workflow. Optional: defaults to the start
                 order of the study workflow.
                 
    Returns:
        Tuple containing the created SampleNextStep instance (if applicable, otherwise None), the error messages and the warning messages. 

    """
    sample_next_step = None
    errors = []
    warnings = []

    if not isinstance(sample_obj, Sample):
        sample_obj = None
        errors.append(f"A valid sample instance must be provided.")

    if not isinstance(study_obj, Study):
        study_obj = None
        errors.append(f"A valid study instance must be provided.")

    if order is None:
        order = study_obj.start
    elif order < study_obj.start or order > study_obj.end:
        errors.append(f"Order must be a positive integer between {study_obj.start} and {study_obj.end}.")
    
    step_order = None
    try:
        step_order = StepOrder.objects.get(order=order, workflow=study_obj.workflow)
    except StepOrder.DoesNotExist:
        errors.append(f"No step found for the given order.")
    
    # Queueing to study workflow implies an existing step order.
    if step_order and sample_obj and study_obj and not errors:
        if sample_obj.matches_sample_type(step_order.step.expected_sample_type):
            try:
                if not SampleNextStep.objects.filter(step=step_order.step, sample=sample_obj).exists():
                    sample_next_step = SampleNextStep.objects.create(step=step_order.step,
                                                                    sample=sample_obj)
                else:
                    sample_next_step = SampleNextStep.objects.get(step=step_order.step, sample=sample_obj)
                if sample_next_step is not None:
                    if not SampleNextStepByStudy.objects.filter(sample_next_step=sample_next_step, step_order=step_order, study=study_obj).exists():
                        SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step, step_order=step_order, study=study_obj)
                    else:
                        warnings.append(("Sample {0} already queued to this study's workflow.", [sample_obj.name]))
            except Exception as err:
                errors.append(err)
        else:
            errors.append(f"Step {step_order.step.name} of study {study_obj.letter} expected {SampleType[step_order.step.expected_sample_type].label} but Sample {sample_obj.name} does not match that sample type.")
    return sample_next_step, errors, warnings

def dequeue_sample_from_specific_step_study_workflow(sample_obj: Sample, study_obj: Study, order: int) -> Tuple[bool, List[str], List[str]]:
    """
    Deletes a SampleNextStep instance to indicate the removal of a sample from a workflow at a specific step. 
    Args:
        `sample_obj`: Sample instance to be dequeued from the study workflow.
        `study_obj`: Study instance currently associated to the sample.
        `order`: Positive integer indicating the current position of the sample in the workflow.
                 
    Returns:
        Tuple containing a boolean stating whether the SampleNextStep instances was deleted or not, the error messages and the warning messages. 

    """
    dequeued = False
    errors = []
    warnings = []

    if not isinstance(sample_obj, Sample):
        sample_obj = None
        errors.append(f"A valid sample instance must be provided.")

    if not isinstance(study_obj, Study):
        study_obj = None
        errors.append(f"A valid study instance must be provided.")
    
    if not order:
        order = None
        errors.append(f"A step order must be provided.")
    
    step_order=None
    # Dequeuing from a specific step
    if order is not None:
        try:
            step_order = StepOrder.objects.get(order=order, workflow=study_obj.workflow)
        except StepOrder.DoesNotExist:
            errors.append(f"No step found for the given order.")
    
    # Dequeuing from study workflow by deleting the SampleNextStep instance
    if sample_obj and study_obj and not errors:
        try:
            # identify the sample next step instance
            sample_next_step_instance = SampleNextStep.objects.filter(sample=sample_obj, step=step_order.step).first()
            if sample_next_step_instance:
                # identify the sample next step by study instance
                sample_next_step_by_study_instance = SampleNextStepByStudy.objects.filter(sample_next_step=sample_next_step_instance,
                                                                                          step_order=step_order,
                                                                                          study=study_obj).first()
                if sample_next_step_by_study_instance:
                    is_last_queue = SampleNextStepByStudy.objects.filter(sample_next_step=sample_next_step_instance).count() < 2
                    sample_next_step_by_study_instance.delete()
                    if is_last_queue:
                        sample_next_step_instance.delete()
                    dequeued = True
                else:
                    dequeued = False # sample next step does not exist for the requested study
            else:
                dequeued = False # sample next step exist for no study
        except Exception as err:
            errors.append(err)
    return dequeued, errors, warnings

def dequeue_sample_from_specific_step_study_workflow_with_updated_last_step_history(sample: Sample, study: Study, order: int) -> Tuple[bool, List[str], List[str]]:
    removed, errors, warnings = dequeue_sample_from_specific_step_study_workflow(sample, study, order)

    if removed and not errors:
        stepHistory = (StepHistory.objects
                        .filter(study=study)
                        .annotate(source_sample=F('process_measurement__source_sample'))
                        .annotate(child_sample=F('process_measurement__lineage__child'))
                        .filter(Case(
                            When(Q(source_sample=sample.pk) & Q(child_sample=None), then=True), # QC?
                            When(Q(child_sample=sample.pk), then=True), # child?
                            default=False,
                            output_field=BooleanField()))
                        .order_by('step_order__order')
                        .last())
        if stepHistory:
            stepHistory.workflow_action = WorkflowAction.DEQUEUE_SAMPLE
            stepHistory.save()
    
    return removed, errors, warnings

def dequeue_sample_from_all_steps_study_workflow(sample_obj: Sample, study_obj: Study) -> Tuple[Union[int, None], List[str], List[str]]:
    """
    Deletes a SampleNextStep instance to indicate the removal of a sample from a specified workflow at any step. 
    Meaning that if the sample is queued in 2 different steps in the provided study, both instances will be deleted. 
    Args:
        `sample_obj`: Sample instance to be dequeued from the study workflow.
        `study_obj`: Study instance currently associated to the sample.
                 
    Returns:
        Tuple containing the number of SampleNextStep instances deleted, the error messages and the warning messages. 

    """
    num_deleted = 0
    errors = []
    warnings = []

    if not isinstance(sample_obj, Sample):
        sample_obj = None
        errors.append(f"A valid sample instance must be provided.")

    if not isinstance(study_obj, Study):
        study_obj = None
        errors.append(f"A valid study instance must be provided.")
    
    # Dequeuing from study workflow by deleting the SampleNextStep instance
    if sample_obj and study_obj and not errors:
        try:
            sample_next_step_instances_to_delete = SampleNextStep.objects.filter(sample=sample_obj)
            for sample_next_step in sample_next_step_instances_to_delete:
                # identify the sample next steps by study instance
                sample_next_step_by_study_instances = SampleNextStepByStudy.objects.filter(sample_next_step=sample_next_step,
                                                                                           study=study_obj)
                for sample_next_step_by_study_instance in sample_next_step_by_study_instances.all():
                    is_last_queue = SampleNextStepByStudy.objects.filter(sample_next_step=sample_next_step).count() < 2
                    sample_next_step_by_study_instance.delete()
                    if is_last_queue:
                        sample_next_step.delete()
                    num_deleted += 1
        except Exception as err:
            errors.append(err)
    return num_deleted, errors, warnings

def is_sample_queued_in_study(sample_obj: Sample, study_obj: Study, order: int=None) -> Tuple[bool, List[str], List[str]]:
    """
    Args:
        `sample_obj`: Sample instance to look for.
        `study_obj`: Study instance where to look the sample in.
        `order`: Positive integer indicating the current position in the workflow. Optional: If not specified then it will look at any step. 
                 
    Returns:
        Tuple containing a boolean stating whether the sample is queued in the study, the error messages and the warning messages. 
    """
    sample_is_queued = None
    errors = []
    warnings = []

    if not isinstance(sample_obj, Sample):
        sample_obj = None
        errors.append(f"A valid sample instance must be provided.")

    if not isinstance(study_obj, Study):
        study_obj = None
        errors.append(f"A valid study instance must be provided.")
    
    step_order=None
    if order is not None:
        try:
            step_order = StepOrder.objects.get(order=order, workflow=study_obj.workflow)
        except StepOrder.DoesNotExist:
            errors.append(f"No step found for the given order.")
    
    # Specify step_order in filter if it is provided
    filters = dict(
        sample=sample_obj,
        studies=study_obj,
        **(dict(sample_next_step_by_study__step_order=step_order) if step_order is not None else dict())
    )
    if SampleNextStep.objects.filter(**filters).exists():
        sample_is_queued = True
    else:
        sample_is_queued = False

    return sample_is_queued, errors, warnings

def has_sample_completed_study(sample_obj: Sample, study_obj: Study) -> Tuple[Union[bool, None], List[str], List[str]]:
    """
    Args:
        `sample_obj`: Sample instance to look for.
        `study_obj`: Study instance where to check if the sample has completed.
                 
    Returns:
        Tuple containing a boolean stating whether the sample has completed the workflow in the study, the error messages and the warning messages. 
    """
    samples_has_completed = None
    errors = []
    warnings = []

    if not isinstance(sample_obj, Sample):
        sample_obj = None
        errors.append(f"A valid sample instance must be provided.")

    if not isinstance(study_obj, Study):
        study_obj = None
        errors.append(f"A valid study instance must be provided.")

    if not errors:
        try:
            step_order = StepOrder.objects.get(order=study_obj.end, workflow=study_obj.workflow)
        except StepOrder.DoesNotExist:
            errors.append(f"No step found for the given order.")

        qs_sample_generated_from_step_with_child = StepHistory.objects.filter(process_measurement__lineage__child=sample_obj, # for step with child
                                                                              study=study_obj, 
                                                                              step_order=step_order)
        qs_sample_on_step_without_child = StepHistory.objects.filter(process_measurement__lineage__isnull=True,      # for step without child
                                                                     process_measurement__source_sample=sample_obj,
                                                                     study=study_obj,
                                                                     step_order=step_order)

        # If the sample has completed the workflow, the StepHistory for the last step order in the study should
        # have a workflow action of NEXT_STEP or REPEAT_STEP
        if qs_sample_generated_from_step_with_child.filter(workflow_action=WorkflowAction.NEXT_STEP).exists() \
        or qs_sample_generated_from_step_with_child.filter(workflow_action=WorkflowAction.REPEAT_STEP).exists() \
        or qs_sample_on_step_without_child.filter(workflow_action=WorkflowAction.NEXT_STEP).exists() \
        or qs_sample_on_step_without_child.filter(workflow_action=WorkflowAction.REPEAT_STEP).exists():
            samples_has_completed = True
        else:
            samples_has_completed = False

    return samples_has_completed, errors, warnings

def move_sample_to_next_step(current_step: Step, current_sample: Sample, process_measurement: ProcessMeasurement=None, workflow_action: WorkflowAction=WorkflowAction.NEXT_STEP, next_sample: Sample=None, keep_current: bool=False) -> Tuple[Union[List[SampleNextStep], None], List[str], List[str]]:
    """
    Service that move the sample to the next step order in a workflow. The service verifies the SampleNextStep instances that match current_step and current_sample.
    A new SampleNextStep instance is created and returned for each current instance using the next_step_order. The current SampleNextStep instances are removed.

    Args:
        `current_step`: Step instance representing the protocol being executed by the template.
        `current_sample`: Sample instance being processed.
        `process_measurement`: Process_measurement related to the step for the current sample. An entry is inserted into StepHistory.
        `workflow_action`: WorkflowAction that was performed on the sample at the step completion. Defaults to WorkflowAction.NEXT_STEP
        `next_sample`: Sample generated during the current_step. Default to None in which case the current_sample will be the next_sample.
        `keep_current`: Boolean that is true if we are to keep the current sample next step. False by default, indicating removal.
    
    Returns:
        Tuple containing the list of new SampleNextStep if any corresponding current SampleNextStep is found or None if an error occurs, errors and warnings.
    """
    new_sample_next_steps = []
    errors = []
    warnings = []

    if not isinstance(current_step, Step):
        errors.append(f"A valid current step instance must be provided.")

    if not isinstance(current_sample, Sample):
        errors.append(f"A valid current sample instance must be provided.")
    
    if not isinstance(workflow_action, WorkflowAction):
        errors.append(f"A valid workflow action instance must be provided.")

    if not errors:
        new_sample = next_sample if next_sample is not None else current_sample

        current_sample_next_steps = SampleNextStep.objects.filter(sample=current_sample, step=current_step)

        for current_sample_next_step in current_sample_next_steps.all():
            for sample_next_step_by_study in SampleNextStepByStudy.objects.filter(sample_next_step=current_sample_next_step).all() :
                next_sample_next_step = None
                study = sample_next_step_by_study.study
                current_step_order = sample_next_step_by_study.step_order
                next_step_order = current_step_order.next_step_order \
                                  if current_step_order.next_step_order and current_step_order.next_step_order.order <= study.end \
                                  else None
                if next_step_order is not None:
                    try:
                        if SampleNextStep.objects.filter(step=next_step_order.step, sample=new_sample).exists():
                            next_sample_next_step = SampleNextStep.objects.get(step=next_step_order.step, sample=new_sample)
                            if not SampleNextStepByStudy.objects.filter(sample_next_step=next_sample_next_step, study=study, step_order=next_step_order).exists():
                                SampleNextStepByStudy.objects.create(sample_next_step=next_sample_next_step, study=study, step_order=next_step_order)
                            elif new_sample.is_pool:
                                warnings.append(("Sample {0} is already queued for step {1} "
                                                "of study {2} of project {3}.", [new_sample.name, next_step_order.order if next_step_order is not None else '', study.letter, study.project.name]))
                            else:
                                errors.append(f"Sample {new_sample.name} is already queued for step {next_step_order.order if next_step_order is not None else ''} "
                                              f"of study {study.letter} of project {study.project.name}.")
                        else:
                            next_sample_next_step = SampleNextStep.objects.create(step=next_step_order.step,
                                                                                  sample=new_sample)
                            if next_sample_next_step is not None:
                                SampleNextStepByStudy.objects.create(sample_next_step=next_sample_next_step, study=study, step_order=next_step_order)
                                new_sample_next_steps.append(next_sample_next_step)
                    except Exception as err:
                        errors.append(f"Failed to create new sample next step instance.")
                try:
                    # Create the entry in StepHistory
                    StepHistory.objects.create(study=study,
                                               step_order=current_step_order,
                                               process_measurement=process_measurement,
                                               sample=current_sample,
                                               workflow_action=workflow_action)
                except Exception as err:
                    errors.append(f"Failed to create StepHistory.")
            try:
                # Remove old sample next step once the new one is created
                if not keep_current:
                    for sample_next_step_by_study in SampleNextStepByStudy.objects.filter(sample_next_step=current_sample_next_step).all():
                        sample_next_step_by_study.delete()
                    current_sample_next_step.delete()
            except Exception as err:
                errors.append(f"Failed to remove old sample next step.")

    # an error will return None, no matching current_sample_next_step will return []
    if errors:
        new_sample_next_steps = None

    return new_sample_next_steps, errors, warnings

def dequeue_sample_from_all_study_workflows_matching_step(sample: Sample, step: Step) -> Tuple[Union[int, None], List[str], List[str]]:
    """
    Service used to remove sample from workflows during template submission. The information of workflow and study is not available.
    Warnings are sent when more than one or no sample_next_step are found. This is normally meant to result in a single removal.

    Args:
        sample: Sample instance that should be removed from workflows.
        step: The workflow step instance that matches the information on the template.
    
    Returns:
        Tuple with the number of removed sample_next_step removed, errors, and warnings.
    """
    removed_count = 0
    errors = []
    warnings = []

    if not isinstance(sample, Sample):
        errors.append(f"A valid sample instance must be provided.")

    if not isinstance(step, Step):
        errors.append(f"A valid step instance must be provided.")

    queued_sample_next_steps = SampleNextStep.objects.filter(sample=sample, step=step)

    for queued_sample_next_step in queued_sample_next_steps.all():
        for sample_next_step_by_study in SampleNextStepByStudy.objects.filter(sample_next_step=queued_sample_next_step).all():
            try:
                sample_next_step_by_study.delete()
                removed_count += 1
            except Exception as err:
                errors.append(err)
        try:
            queued_sample_next_step.delete()
        except Exception as err:
            errors.append(err)

    if removed_count == 0:
        warnings.append(("Sample {0} does not appear to to be queued to step {1}.", [sample.name, step.name]))
    elif removed_count > 1:
        warnings.append(("Sample {0} is queued to step {1} for {2} studies. You are about to remove it from all study workflows.", [sample.name, step.name, removed_count]))

    return removed_count, errors, warnings

def remove_sample_from_workflow(current_step: Step, current_sample: Sample, process_measurement: ProcessMeasurement, workflow_action: WorkflowAction=WorkflowAction.DEQUEUE_SAMPLE):
    """
    Service that remove the sample from all study workflows. The service verifies the SampleNextStep instances that match current_step and current_sample.
    dequeue_sample_from_all_study_workflows_matching_step is called for each one.

    Args:
        `current_step`: Step instance representing the protocol being executed by the template.
        `current_sample`: Sample instance being processed.
        `process_measurement`: Process_measurement related to the step for the current sample. An entry is inserted into StepHistory.
        `workflow_action`: WorkflowAction that was performed on the sample at the step completion. Defaults to WorkflowAction.DEQUEUE_SAMPLE
    
    Returns:
        Tuple containing the list of new SampleNextStep if any corresponding current SampleNextStep is found or None if an error occurs, errors and warnings.
    """
    removed_count = 0
    errors = []
    warnings = []

    if not isinstance(current_step, Step):
        errors.append(f"A valid current step instance must be provided.")

    if not isinstance(current_sample, Sample):
        errors.append(f"A valid current sample instance must be provided.")
    
    if not isinstance(process_measurement, ProcessMeasurement):
        errors.append(f"A valid process measurement instance must be provided.")

    if not isinstance(workflow_action, WorkflowAction):
        errors.append(f"A valid workflow action instance must be provided.")

    if not errors:

        current_sample_next_steps = SampleNextStep.objects.filter(sample=current_sample, step=current_step)

        for current_sample_next_step in current_sample_next_steps.all():
            for sample_next_step_by_study in SampleNextStepByStudy.objects.filter(sample_next_step=current_sample_next_step).all() :
                study = sample_next_step_by_study.study
                current_step_order = sample_next_step_by_study.step_order
                try:
                    # Create the entry in StepHistory
                    StepHistory.objects.create(study=study,
                                               step_order=current_step_order,
                                               process_measurement=process_measurement,
                                               sample=current_sample,
                                               workflow_action=workflow_action)
                except Exception as err:
                    errors.append(f"Failed to create StepHistory.")

    removed_count, errors_dequeue, warnings_dequeue = dequeue_sample_from_all_study_workflows_matching_step(sample=current_sample,
                                                                                                            step=current_step)
    errors.extend(errors_dequeue)
    warnings.extend(warnings_dequeue)

    # an error will return None, no matching current_sample_next_step will return 0
    if errors:
        removed_count = None

    return removed_count, errors, warnings


def execute_workflow_action(workflow_action: str, step: Step, current_sample: Sample, process_measurement: ProcessMeasurement=None, next_sample: Sample=None) -> Tuple[List[str], List[str]]:
    """
    Execute the workflow action listed in the template.

    Args:
        `workflow_action`: String defining the action to complete on the sample workflow after template submission.
        `step`: Step instance defining the current step executed by the template
        `current_sample`: Sample instance being processed by the template (input).
        `process_measurement`: Process measurement associated to the template recording the sample transition.
        `next_sample`: Sample instance being created by the template (output). Defaults to None.

    Returns:
        Tuple listing the errors and warnings.
    """
    errors = []
    warnings = []

    if workflow_action == WorkflowAction.NEXT_STEP.label:
        _, errors, _ = move_sample_to_next_step(current_step=step,
                                                current_sample=current_sample,
                                                process_measurement=process_measurement,
                                                workflow_action=WorkflowAction.NEXT_STEP,
                                                next_sample=next_sample,
                                                keep_current=False)
    elif workflow_action == WorkflowAction.DEQUEUE_SAMPLE.label:
        _, errors, _ = remove_sample_from_workflow(current_step=step,
                                                   current_sample=current_sample,
                                                   process_measurement=process_measurement,
                                                   workflow_action=WorkflowAction.DEQUEUE_SAMPLE)
    elif workflow_action == WorkflowAction.REPEAT_STEP.label:
        _, errors, _ = move_sample_to_next_step(current_step=step,
                                                current_sample=current_sample,
                                                process_measurement=process_measurement,
                                                workflow_action=WorkflowAction.REPEAT_STEP,
                                                next_sample=next_sample,
                                                keep_current=True)
    elif workflow_action == WorkflowAction.IGNORE_WORKFLOW.label:
        warnings.append(("Sample {0} current process will not be recorded as part of a workflow.", [current_sample.name]))
    else:
        _, errors, _ = move_sample_to_next_step(current_step=step,
                                                current_sample=current_sample,
                                                process_measurement=process_measurement,
                                                workflow_action=WorkflowAction.NEXT_STEP,
                                                next_sample=next_sample,
                                                keep_current=False)
    return errors, warnings

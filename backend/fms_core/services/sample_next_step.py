from django.core.exceptions import ValidationError
from fms_core.models import SampleNextStep, StepOrder, Sample, Study
from typing import  List, Tuple, Union

def queue_sample_to_study_workflow(sample_obj: Sample, study_obj: Study, order: int=None) -> Tuple[Union[SampleNextStep, None], List[str], List[str]]:
    """
    Create a SampleNextStep instance to indicate the position of a sample in a study workflow. The order of insertion defaults to
    the start order of the study workflow.

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
    
    try:
        step_order = StepOrder.objects.get(order=order, workflow=study_obj.workflow)
    except StepOrder.DoesNotExist:
        errors.append(f"No step found for the given order.")
    
    # Queueing to study workflow implies an existing step order.
    # To reach past the end (step_order is None) use move_sample_to_next_step.
    if step_order and sample_obj and study_obj and not errors:
        try:
            sample_next_step = SampleNextStep.objects.create(step_order=step_order,
                                                             sample=sample_obj,
                                                             study=study_obj)
        except Exception as err:
            errors.append(err)
    return sample_next_step, errors, warnings

def dequeue_sample_from_specifc_step_study_workflow(sample_obj: Sample, study_obj: Study, order: int) -> Tuple[Union[int, None], List[str], List[str]]:
    """
    Deletes a SampleNextStep instance to indicate the removal of a sample from a workflow at a specific step. 
    Args:
        `sample_obj`: Sample instance to be dequeued from the study workflow.
        `study_obj`: Study instance currently associated to the sample.
        `order`: Positive integer indicating the current position of the sample in the workflow.
                 
    Returns:
        Tuple containing the number of SampleNextStep instances deleted, the error messages and the warning messages. 

    """
    dequeued = None
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
        errors.append(f"A step order must be provided.  ")
    
    step_order=None
    # Dequeuing from a specific step
    if order is not None:
        try:
            step_order = StepOrder.objects.get(order=order, workflow=study_obj.workflow)
        except StepOrder.DoesNotExist:
            errors.append(f"No step found for the given order.")
    
    # Dequeuing from study workflow by deleting the SampleNextStep instance
    if sample_obj and study_obj and step_order and not errors:
        try:
            num_deleted = SampleNextStep.objects.filter(sample=sample_obj, study=study_obj, step_order=step_order).delete()
        except Exception as err:
            errors.append(err)
    return num_deleted, errors, warnings

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
    dequeued = None
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
            num_deleted = SampleNextStep.objects.filter(sample=sample_obj, study=study_obj).delete()
        except Exception as err:
            errors.append(err)
    return num_deleted, errors, warnings

def is_sample_queued_in_study(sample_obj: Sample, study_obj: Study, order: int=None) -> Tuple[Union[bool, None], List[str], List[str]]:
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
        study=study_obj,
        **dict(step_order=step_order) if step_order else dict()
    )
    if SampleNextStep.objects.filter(filters).exists():
        sample_is_queued = True
    else:
        sample_is_queued = False

    return sample_is_queued, errors, warnings
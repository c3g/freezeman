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
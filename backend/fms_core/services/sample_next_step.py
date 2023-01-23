from django.core.exceptions import ValidationError
from fms_core.models import SampleNextStep, StepOrder, Sample, Study, Step
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
    
    step_order = None
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
            # Delete exactly one instance
            sample_next_step_instance = SampleNextStep.objects.filter(sample=sample_obj, study=study_obj, step_order=step_order).first()
            if sample_next_step_instance:
                sample_next_step_instance.delete()
                dequeued = True
            else:
                dequeued = False
        except Exception as err:
            errors.append(err)
    return dequeued, errors, warnings

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
            instances_to_delete = SampleNextStep.objects.filter(sample=sample_obj, study=study_obj)
            for instance in instances_to_delete:
                instance.delete()
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
        study=study_obj,
        **(dict(step_order=step_order) if step_order is not None else dict())
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
    
    # If the sample has completed the workflow, the step order should be None
    if SampleNextStep.objects.filter(sample=sample_obj, study=study_obj, step_order=None).exists():
        samples_has_completed = True
    else:
        samples_has_completed = False

    return samples_has_completed, errors, warnings

def move_sample_to_next_step(current_step: Step, current_sample: Sample, next_sample: Sample=None) -> Tuple(Union(List[SampleNextStep], None), List[str], List[str]):
  """
  Service that move the sample to the next step order in a workflow. The service verifies the SampleNextStep instances that match current_step and current_sample.
  A new SampleNextStep instance is created and returned for each current instance using the next_step_order. The current SampleNextStep instances are removed.

  Args:
      `current_step`: Step instance representing the protocol being executed by the template.
      `current_sample`: Sample instance being processed.
      `next_sample`: Sample generated during the current_step. Default to None in which case the current_sample will be the next_sample.
  
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

  if not errors:
      new_sample = next_sample if next_sample is not None else current_sample

      current_sample_next_steps = SampleNextStep.objects.filter(sample=current_sample, step_order__step=current_step)

      for current_sample_next_step in current_sample_next_steps.all():
          if SampleNextStep.objects.filter(step_order=current_sample_next_step.step_order.next_step_order,
                                           sample=new_sample,
                                           study=current_sample_next_step.study).exists():
              if new_sample.is_pool:
                  warnings.append(f"Sample {new_sample.name} is already queued for step {current_sample_next_step.step_order.next_step_order.order}"
                                  f"of study {current_sample_next_step.study.letter} of project {current_sample_next_step.study.project.name}.")
              else:
                  errors.append(f"Sample {new_sample.name} is already queued for step {current_sample_next_step.step_order.next_step_order.order}"
                                f"of study {current_sample_next_step.study.letter} of project {current_sample_next_step.study.project.name}.")
          else:
              next_sample_next_step = SampleNextStep.objects.create(step_order=current_sample_next_step.step_order.next_step_order,
                                                                    sample=new_sample,
                                                                    study=current_sample_next_step.study)
          new_sample_next_steps.append(next_sample_next_step)

  # an error will return None, no matching current_sample_next_step will return []
  if errors:
      new_sample_next_steps = None

  return new_sample_next_steps, errors, warnings
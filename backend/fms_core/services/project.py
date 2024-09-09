from collections import defaultdict
from fms_core.utils import dict_remove_falsy_entries
from fms_core.services.sample_next_step import is_sample_queued_in_study, queue_sample_to_study_workflow
from fms_core.services.study import get_study
from fms_core.models import Project, Sample
from django.core.exceptions import ValidationError

def get_project(name=None):
    project = None
    errors = []
    warnings = []

    if name:
        try:
            project = Project.objects.get(name=name)
        except Project.DoesNotExist:
            errors.append(f"Could not find Project with name {name}")
    else:
        errors.append(f"Name is required to get a project.")

    return (project, errors, warnings)

def create_project(name=None, principal_investigator=None, requestor_name=None,
                   requestor_email=None, status=None, targeted_end_date=None, comment=None):
    project = None
    errors = []
    warnings = []

    project_data = dict(
        name=name,
        # Optional attributes
        **(dict(principal_investigator=principal_investigator) if principal_investigator is not None else dict()),
        **(dict(requestor_name=requestor_name) if requestor_name is not None else dict()),
        **(dict(requestor_email=requestor_email) if requestor_email is not None else dict()),
        **(dict(status=status) if status is not None else dict()),
        **(dict(targeted_end_date=targeted_end_date) if targeted_end_date is not None else dict()),
        **(dict(comment=comment) if comment is not None else dict())
    )

    try:
        project = Project.objects.create(**project_data)
    except ValidationError as e:
        errors.append(str(e))

    return (project, errors, warnings)

def add_sample_to_study(sample: Sample, project: Project, study_letter: str, step_order: int | None = None) -> tuple[dict[str, list | str], dict[str, list | str]]:
    """Add a sample to a study of a project.
    If `step_order` it is not specified, the sample will be queued at the start of the study.

    Args:
        sample: Sample instance
        project: Project instance
        study_letter: Letter of an existing study
        step_order: Step order of a step in the study. Defaults to None.

    Returns:
        Tuple of errors and warnings
    """

    errors = defaultdict(list)
    warnings = defaultdict(list)

    def helper_add_sample_to_study(sample: Sample, project: Project, study_letter: str, step_order: int | None = None):
        # Make sure the sample is already associated to the project of the given study.
        # In case of pool one of the samples has to be associated to the project
        if sample.is_pool:
            if not any([derived_by_sample.project == project for derived_by_sample in sample.derived_by_samples.all()]):
                return f"There are no samples in pool [{sample.name}] that is linked to project [{project.name}]."
        elif sample.derived_by_samples.first().project != project:
            return f"Sample [{sample.name}] is not linked to project [{project.name}]."

        if not study_letter:
            return f"Study letter is required to add the sample to a study."

        study_obj, errors['get_study'], warnings['get_study'] = get_study(project, study_letter)
        if not study_obj:
            return f"Specified study [{study_letter}] doesn't exist for project [{project.name}]."

        # To avoid empty step orders
        step_order = step_order if step_order else study_obj.start

        # Check if sample is already queued 
        is_sample_queued, errors['is_sample_queued_in_study'], warnings['is_sample_queued_in_study'] = is_sample_queued_in_study(sample, study_obj, step_order)
        if not is_sample_queued:
            _, errors['queue_sample_to_study_workflow'], warnings['queue_sample_to_study_workflow'] = queue_sample_to_study_workflow(sample, study_obj, step_order)
        else:
            return f"Sample [{sample.name}] is already queued in study [{study_letter}] of project [{project.name}] at step [{step_order}]."


    error = helper_add_sample_to_study(sample, project, study_letter, step_order)
    if error:
        errors['add_sample_to_study'].append(error)

    dict_remove_falsy_entries(errors)
    dict_remove_falsy_entries(warnings)

    return (errors, warnings)

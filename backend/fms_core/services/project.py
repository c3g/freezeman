from fms_core.services.sample_next_step import is_sample_queued_in_study, queue_sample_to_study_workflow
from fms_core.services.study import get_study
from fms_core.models.sample import Sample
from fms_core.models import Project
from django.core.exceptions import ValidationError
from datetime import datetime

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

def add_sample_to_study(sample: Sample, project: Project, study_letter: str, step_order: int | None = None):
    errors = {}
    warnings = {}

    # Make sure the sample is already associated to the project of the given study. In case of pool one of the samples has to be associated to the project
    if sample.is_pool:
        if not any([derived_by_sample.project == project for derived_by_sample in sample.derived_by_samples.all()]):
                errors['add_to_study'] = (f"One of the samples in pool [{sample.name}] has to be associated to project [{project.name}].")
    else: 
        if sample.derived_by_samples.first().project != project:
            errors['add_to_study'] = (f"Sample [{sample.name}] is not associated to project [{project.name}].")

    # Queue sample to study if specified
    if study_letter:
        study_obj, errors['study'], warnings['study'] = get_study(project, study_letter)

        if study_obj:
            # To avoid empty step orders
            step_order = step_order if step_order else study_obj.start

            # Check if sample is already queued 
            is_sample_queued, errors['sample_queued'], warnings['sample_queued'] = is_sample_queued_in_study(sample, study_obj, step_order)
            if not is_sample_queued:
                _, errors['add_to_study'], warnings['add_to_study'] = queue_sample_to_study_workflow(sample, study_obj, step_order)
            else:
                errors['study'] = f"Sample [{sample.name}] is already queued in study [{study_letter}] \
                    of project [{project.name}] at step [{step_order}]."
        else:
            errors['study'] = f"Specified study [{study_letter}] doesn't exist for project [{project.name}]."
    else:
        errors['add_to_study'] = f"A study needs to be specified to be able to add the sample to a study."
    
    return (errors, warnings)

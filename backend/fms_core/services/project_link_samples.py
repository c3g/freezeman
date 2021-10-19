from django.core.exceptions import ValidationError
from fms_core.models import SampleByProject

def create_link(sample=None, project=None):
    project_sample_link = None
    errors = []
    warnings = []

    if not all([sample, project]):
        errors.append(f"Unable to process sample or project information.")
        return (project_sample_link, errors, warnings)

    if SampleByProject.objects.filter(sample=sample, project=project).exists():
        errors.append(f"[Sample {sample.name}] is already associated to project [{project.name}].")
        return (project_sample_link, errors, warnings)

    link_data = dict(sample=sample, project=project)

    try:
        project_sample_link = SampleByProject.objects.create(**link_data)
    except ValidationError as e:
        errors.append(str(e))

    return (project_sample_link, errors, warnings)

def remove_link(sample=None, project=None):
    num_objects_deleted = 0
    errors = []
    warnings = []

    if not all([sample, project]):
        errors.append(f"Unable to process sample or project information.")
        return (num_objects_deleted, errors, warnings)

    if not SampleByProject.objects.filter(sample=sample, project=project).exists():
        errors.append(f"Sample [{sample.name}] is not currently associated to project [{project.name}].")
        return (num_objects_deleted, errors, warnings)

    try:
        num_objects_deleted, _ = SampleByProject.objects.filter(sample=sample, project=project).delete()
    except ValidationError as e:
        errors.append(str(e))

    return (num_objects_deleted, errors, warnings)
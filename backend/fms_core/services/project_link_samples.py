from django.core.exceptions import ValidationError
from fms_core.models import SampleByProject

def create_link(link=False, sample=None,  project=None):
    project_sample_link = None
    errors = []
    warnings = []

    if link:
        errors.append(f"[Sample {sample.name}] is already associated to project [{project.name}].")
        return (project_sample_link, errors, warnings)

    link_data = dict(sample=sample, project=project)

    try:
        project_sample_link = SampleByProject.objects.create(**link_data)
    except ValidationError as e:
        errors.append(str(e))

    return (project_sample_link, errors, warnings)

def remove_link(link=True, sample=None,  project=None):
    num_deleted = 0
    errors = []
    warnings = []

    if not link:
        errors.append(f"Sample [{sample.name}] is not currently associated to project [{project.name}].")
        return (num_deleted, errors, warnings)

    try:
        num_deleted, _ = SampleByProject.objects.filter(sample=sample, project=project).delete()
    except ValidationError as e:
        errors.append(str(e))

    return (num_deleted, errors, warnings)
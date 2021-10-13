from django.core.exceptions import ValidationError
from fms_core.models import SampleByProject

def create_link(sample=None,  project=None):
    project_sample_link = None
    errors = []
    warnings = []

    link_data = dict(sample=sample, project=project)

    try:
        project_sample_link = SampleByProject.objects.create(**link_data)
    except ValidationError as e:
        errors.append(str(e))

    return (project_sample_link, errors, warnings)

def remove_link(sample=None,  project=None):
    errors = []
    warnings = []

    try:
        num_deleted, _ = SampleByProject.objects.filter(sample=sample, project=project).delete()
    except ValidationError as e:
        errors.append(str(e))

    return (num_deleted, errors, warnings)
from django.core.exceptions import ValidationError
from fms_core.models import Sample, Project

def create_link(sample=None, project=None):
    project_sample_link = None
    errors = []
    warnings = []

    if not all([sample, project]):
        errors.append(f"Unable to process sample or project information.")
        return (project_sample_link, errors, warnings)

    if not isinstance(sample, Sample) or not  isinstance(project, Project):
        errors.append(f"Invalid sample or project objects.")
        return (project_sample_link, errors, warnings)

    if sample.is_pool:
        errors.append(f"Pooled samples and libraries cannot be assigned to a project. Assign the project to parent individually.")
        return (project_sample_link, errors, warnings)

    for derived_sample in sample.derived_samples.all():
        if derived_sample.project is not None and derived_sample.project.id == project.id:
            errors.append(f"[Sample {sample.name}] is already associated to project [{project.name}].")
            return (project_sample_link, errors, warnings)

        try:
            derived_sample.project = project
            derived_sample.save()
        except ValidationError as e:
            errors.append(str(e))

    return (project_sample_link, errors, warnings)

def remove_link(sample=None, project=None):
    num_links_removed = 0
    errors = []
    warnings = []

    if not all([sample, project]):
        errors.append(f"Unable to process sample or project information.")
        return (num_links_removed, errors, warnings)

    if not isinstance(sample, Sample) or not isinstance(project, Project):
        errors.append(f"Invalid sample or project objects.")
        return (num_links_removed, errors, warnings)

    if sample.is_pool:
        errors.append(f"Pooled samples and libraries cannot have their project association removed directly. "
                      f"Remove the project from parents individually.")
        return (num_links_removed, errors, warnings)

    for derived_sample in sample.derived_samples.all():
        if derived_sample.project is None or not derived_sample.project.id == project.id:
            errors.append(f"Sample [{sample.name}] is not currently associated to project [{project.name}].")
            return (num_links_removed, errors, warnings)

        try:
            derived_sample.project = None
            derived_sample.save()
            num_objects_deleted += 1
        except ValidationError as e:
            errors.append(str(e))

    return (num_links_removed, errors, warnings)
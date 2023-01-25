from django.core.exceptions import ValidationError
from fms_core.models import Sample, Project

def create_link(sample=None, project=None):
    created_link = False
    errors = []
    warnings = []

    if not all([sample, project]):
        errors.append(f"Unable to process sample or project information.")
        return (created_link, errors, warnings)

    if not isinstance(sample, Sample) or not  isinstance(project, Project):
        errors.append(f"Invalid sample or project objects.")
        return (created_link, errors, warnings)

    if sample.is_pool:
        errors.append(f"Pooled samples and libraries cannot be assigned to a project. Assign the project to parent individually.")
        return (created_link, errors, warnings)

    for derived_sample in sample.derived_samples.all():
        if derived_sample.project is not None and derived_sample.project.id == project.id:
            warnings.append(f"[Sample {sample.name}] is already associated to project [{project.name}].")
        else:
            if derived_sample.project is not None:
                warnings.append(f"[Sample {sample.name}] is already associated to another project [{derived_sample.project.name}].")
            try:
                derived_sample.project = project
                derived_sample.save()
                created_link = True
            except ValidationError as e:
                errors.append(str(e))

    return (created_link, errors, warnings)

def remove_link(sample=None, project=None):
    link_removed = False
    errors = []
    warnings = []

    if not all([sample, project]):
        errors.append(f"Unable to process sample or project information.")
        return (link_removed, errors, warnings)

    if not isinstance(sample, Sample) or not isinstance(project, Project):
        errors.append(f"Invalid sample or project objects.")
        return (link_removed, errors, warnings)

    if sample.is_pool:
        errors.append(f"Pooled samples and libraries cannot have their project association removed directly. "
                      f"Remove the project from parents individually.")
        return (link_removed, errors, warnings)

    for derived_sample in sample.derived_samples.all():
        if derived_sample.project is None or not derived_sample.project.id == project.id:
            warnings.append(f"Sample [{sample.name}] is not currently associated to project [{project.name}].")
        else:
            try:
                derived_sample.project = None
                derived_sample.save()
                link_removed = True
            except ValidationError as e:
                errors.append(str(e))

    return (link_removed, errors, warnings)
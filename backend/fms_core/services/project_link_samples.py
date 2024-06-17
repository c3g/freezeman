from django.core.exceptions import ValidationError
from fms_core.models import Sample, Project
from fms_core.services.sample_next_step import dequeue_sample_from_all_steps_study_workflow

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

    for derived_by_sample in sample.derived_by_samples.all():
        if derived_by_sample.project is not None and derived_by_sample.project.id == project.id:
            warnings.append(("[Sample {0}] is already associated to project [{1}].", [sample.name, project.name]))
        else:
            if derived_by_sample.project is not None:
                warnings.append(("[Sample {0}] is already associated to another project [{1}]. "
                                "Sample will be removed from all currently linked studies.", [sample.name, derived_by_sample.project.name]))
                # remove all previous study linked to the sample for this project
                for study in derived_by_sample.project.studies.all():
                    _, dequeue_errors, dequeue_warnings = dequeue_sample_from_all_steps_study_workflow(sample, study)
                    errors.extend(dequeue_errors)
                    warnings.extend(dequeue_warnings)
            try:
                derived_by_sample.project = project
                derived_by_sample.save()
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

    for derived_by_sample in sample.derived_by_samples.all():
        if derived_by_sample.project is None or not derived_by_sample.project.id == project.id:
            warnings.append(("Sample [{0}] is not currently associated to project [{1}].", [sample.name, project.name]))
        else:
            try:
                derived_by_sample.project = None
                derived_by_sample.save()
                link_removed = True
            except ValidationError as e:
                errors.append(str(e))

    return (link_removed, errors, warnings)
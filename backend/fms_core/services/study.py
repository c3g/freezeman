from django.core.exceptions import ValidationError
from fms_core.models import Study

def create_study(letter, project, workflow, start, end, reference_genome=None):
    study = None
    errors = {}
    warnings = {}

    if not letter:
        errors['letter'] = 'Missing letter.'
        return study, errors, warnings

    if not project:
        errors['project'] = 'Missing project.'
        return study, errors, warnings

    if not workflow:
        errors['workflow'] = 'Missing workflow.'
        return study, errors, warnings

    if not start:
        errors['start'] = 'Missing start.'
        return study, errors, warnings
    
    if not end:
        errors['end'] = 'Missing end.'
        return study, errors, warnings

    try:
        study = Study.objects.create(letter=letter,
                                     project=project,
                                     workflow=workflow,
                                     start=start,
                                     end=end,
                                     reference_genome=reference_genome)
    except ValidationError as e:
        errors = { **errors, **e.message_dict }

    return study, errors, warnings


def get_study(project_obj, study_letter):
    """
    Retrieve a specific study for a given project. Studies are identified by a sequentially attributed capital letter.

    Args:
        `project_obj`: Project model instance for the study.
        `study_letter`: Capital letter matching the desired study.

    Returns:
        Tuple containing the found study model instance (if applicable, otherwise None), the error messages and the warning messages. 

    """
    study = None
    errors = []
    warnings = []

    if project_obj and study_letter:
        try:
            study = Study.objects.get(project=project_obj, letter=study_letter)
        except Study.DoesNotExist:
            errors.append(f"Could not find a study for project {project_obj.name} and letter '{study_letter}'")
    else:
        errors.append(f"Both a project and a study letter are required to retrieve a study.")

    return (study, errors, warnings)

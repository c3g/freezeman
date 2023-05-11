from django.core.exceptions import ValidationError
from fms_core.models import Study, Project

import string

def create_study(project, workflow, start, end):
    """
     Create a study for a given project. The service generates a sequential letter that serves to identify the study.

     Args:
         `project`: Project model instance for the study.
         `workflow`: Workflow model instance linked to the study.
         `start`: The start step on the workflow for the study.
         `end`: The end step on the workflow for the study.

     Returns:
         Tuple containing the created study object (or None), the error messages and the warning messages. 

     """
    study = None
    errors = {}
    warnings = {}

    if not project:
        errors['project'] = 'Missing project.'

    if not workflow:
        errors['workflow'] = 'Missing workflow.'

    if not start:
        errors['start'] = 'Missing start.'
    
    if not end:
        errors['end'] = 'Missing end.'
    
    if errors:
        return study, errors, warnings

    occupied_letters = sorted(Study.objects.filter(project=project).values_list('letter', flat=True))
    letter = chr(ord(max(occupied_letters)) + 1) if len(occupied_letters) > 0 else 'A'
    
    # Find earlier missing letter
    for c in range(len(occupied_letters)):
        expected_letter = chr(ord('A') + c)
        # assumes occupied_letters is sorted alphabetically
        if expected_letter != occupied_letters[c]:
            # expected_letter missing
            letter = expected_letter
            break

    try:
        study = Study.objects.create(letter=letter,
                                     project=project,
                                     workflow=workflow,
                                     start=start,
                                     end=end)
    except ValidationError as e:
        errors = { **errors, **e.message_dict }

    return study, errors, warnings


def get_study(project_obj: Project, study_letter: str):
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

    if not isinstance(project_obj, Project):
        errors.append(f"A valid project instance must be provided.")

    if project_obj and study_letter:
        try:
            study = Study.objects.get(project=project_obj, letter=study_letter)
        except Study.DoesNotExist:
            errors.append(f"Could not find a study for project {project_obj.name} and letter '{study_letter}'")
    else:
        errors.append(f"Both a project and a study letter are required to retrieve a study.")

    return study, errors, warnings

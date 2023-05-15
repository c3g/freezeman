from django.core.exceptions import ValidationError
from fms_core.models import Study, Project, StepHistory, SampleNextStep, SampleNextStepByStudy

from collections import defaultdict
from typing import Dict, List, Tuple
import string

def new_letter(project):
    def skip_char(letter: str, distance: int):
        return chr(ord(letter) + distance)

    FIRST_LETTER = 'A'
    occupied_letters = sorted(Study.objects.filter(project=project).values_list('letter', flat=True))
    new_letter = skip_char(max(occupied_letters), 1) if len(occupied_letters) > 0 else FIRST_LETTER
    
    # Find earlier missing letter
    for c in range(len(occupied_letters)):
        expected_letter = skip_char(FIRST_LETTER, c)
        # assumes occupied_letters is sorted alphabetically
        if expected_letter != occupied_letters[c]:
            # expected_letter missing
            new_letter = expected_letter
            break
    
    return new_letter

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
    
    letter = new_letter(project)

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

def can_remove_study(study: int) -> Tuple[bool, Dict[str, List[str]], Dict[str, List[str]]]:
    warnings = {}
    errors = defaultdict(list)
    is_removable = True

    if StepHistory.objects.filter(study=study).exists():
        errors['StepHistory'].append("At least one StepHistory is associated with the Study")
    if SampleNextStep.objects.filter(studies__id=study).exists():
        errors['SampleNextStep'].append("At least one SampleNextStep is associated with the Study")
    if SampleNextStepByStudy.objects.filter(study=study).exists():
        errors['SampleNextStepByStudy'].append("At least one SampleNextStepByStudy is associated with the Study")
    
    is_removable = not any(bool(error) for error in errors.values())

    return is_removable, errors, warnings
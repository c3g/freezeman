from django.core.exceptions import ValidationError
from fms_core.models import Study

import string

def create_study(project, workflow, start, end, reference_genome=None):
    """
     Create a study for a given project. The service generates a sequential letter that serves to identify the study.

     Args:
         `project`: Project model instance for the study.
         `workflow`: Workflow model instance linked to the study.
         `start`: The start step on the workflow for the study.
         `end`: The end step on the workflow for the study.
         `reference_genome`: The reference genome for the study.

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

    # Generate a sequential letter by counting the number of existing studies tied to the provided project
    study_count = Study.objects.filter(project=project).count()
    letter = string.ascii_uppercase[study_count]

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

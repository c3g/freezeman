from django.core.exceptions import ValidationError
from fms_core.models import Study

def create_study(letter, project, worfklow, start, end, reference_genome=None):
    study = None
    errors = {}
    warnings = {}

    if not letter:
        errors['letter'] = 'Missing letter.'
        return study, errors, warnings

    if not project:
        errors['project'] = 'Missing project.'
        return study, errors, warnings

    if not worfklow:
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
                                    worfklow=worfklow,
                                    start=start,
                                    end=end,
                                    reference_genome=reference_genome)
    except ValidationError as e:
        errors = { **errors, **e.message_dict }

    return study, errors, warnings

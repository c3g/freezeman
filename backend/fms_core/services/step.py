from django.core.exceptions import ValidationError
from fms_core.models import SampleNextStep, StepOrder, Step, Sample, Study
from typing import  List, Tuple, Union

def get_step_from_template(protocol, template_sheets, template_sheet_definition):
    """
    Retrieve the workflow step that fits the data provided by the template. If a protocol as no step with specification,
    the single step is returned. Otherwise, each specification of each step related to the given protocol is matched in the sheets.
    Once all match are done the sheets matches are stitched and the match is established to return a single step.

    Args:
        `protocol`: Protocol instance that matches the template received.
        `template_sheets`: Template importer sheets.
        `template_sheet_definition`: Sheets info uses to stitch together sheet data.

    Returns:
        Tuple with a dict {row_id, matching_step} for each sample if a match is found (otherwise None), errors and warnings.
    """
    matching_step = None
    matching_dict = {}
    errors = []
    warnings = []
    candidate_steps = Step.objects.filter(protocol=protocol).all()

    if len(candidate_steps) == 1:
        matching_step = candidate_steps.first()
        # TODO : iterate through the sample sheet (longest) to map to row_ids 
        return matching_dict, errors, warnings
    elif not candidate_steps:
        errors.append(f"No step matches the given protocol.")
        return matching_dict, errors, warnings
    else:
        # TODO : add matching code using sheets and candidate steps specifications.
        return matching_dict, errors, warnings


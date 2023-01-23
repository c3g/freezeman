from django.core.exceptions import ValidationError
from fms_core.models import SampleNextStep, StepOrder, Step, Sample, Study
from fms_core.utils import str_cast_and_normalize
from typing import  List, Tuple, Union
from collections import defaultdict



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
    matching_dict = defaultdict(list)
    stitch_dict = {}
    errors = []
    warnings = []
    candidate_steps = Step.objects.filter(protocol=protocol).all()

    # build stitch column dict from template sheet definition 
    for sheet in template_sheet_definition:
        stitch_dict[sheet["name"]] = sheet["stitch_column"]

    # get sample sheet : the one with most rows
    row_tupple = [(sheet_name, len(template_sheet.rows)) for sheet_name, template_sheet in template_sheets.items()]
    sample_sheet_name = sorted(row_tupple, key=lambda x: x[1])[-1][0]

    # build a row_id to stitch_value dict for each sample sheet line
    row_id_to_stitch_dict = {row_id: row_data[stitch_dict[sample_sheet_name]] for row_id, row_data in enumerate(template_sheets[sample_sheet_name].rows)}
    
    if len(candidate_steps) == 1:
        matching_step = candidate_steps.first()
        matching_dict = {row_id: matching_step for row_id, _ in enumerate(template_sheets[sample_sheet_name].rows)}
        return matching_dict, errors, warnings
    elif not candidate_steps:
        errors.append(f"No step matches the given protocol.")
        return matching_dict, errors, warnings
    else:
        work_dict = {}
        for candidate_step in candidate_steps:
            sample_sheet_matches = defaultdict(list)
            stiched_matches = defaultdict(list)
            for step_specification in candidate_step.step_specifications.all():
                sheet = template_sheets[step_specification.sheet_name]
                for row_id, row_data in enumerate(sheet.rows):
                    stitch_value = str_cast_and_normalize(row_data[stitch_dict[step_specification.sheet_name]])
                    match = (str_cast_and_normalize(row_data[step_specification.column_name]).upper() == step_specification.value.upper())
                    if step_specification.sheet_name == sample_sheet_name:
                        sample_sheet_matches[row_id].append(match)
                    else: 
                        stiched_matches[stitch_value].append(match)
            work_dict[candidate_step] = {row_id: sample_sheet_matches[row_id] + stiched_matches[row_id_to_stitch_dict[row_id]] for row_id, _ in enumerate(template_sheets[sample_sheet_name].rows)}
        # build the return dict from work dict
        for candidate_step, rows in work_dict.items():
            for row_id, matches in rows.items():
                if all(matches):
                    matching_dict[row_id] = candidate_step
            
        return matching_dict, errors, warnings


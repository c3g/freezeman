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

    # get sample sheet : the first one that is not a batch sheet
    sample_sheet_list = [sheet["name"] for sheet in template_sheet_definition if not sheet.get("batch", False)]
    sample_sheet_name = sample_sheet_list.pop() # get only a single name

    # build stitch column dict from template sheet definition
    if all(sheet.get("stitch_column", False) for sheet in template_sheet_definition):
        for sheet in template_sheet_definition:
            stitch_dict[sheet["name"]] = sheet["stitch_column"]
         # build a row_id to stitch_value dict for each sample sheet line
        row_id_to_stitch_dict = {row_id: row_data[stitch_dict[sample_sheet_name]] for row_id, row_data in enumerate(template_sheets[sample_sheet_name].rows)}
    else:
        stitch_dict = None
        row_id_to_stitch_dict = defaultdict(list)
    
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
                    template_step_specification = str_cast_and_normalize(row_data[step_specification.column_name])
                    if isinstance(template_step_specification, str):
                        match = (template_step_specification.upper() == step_specification.value.upper())
                    else:
                        match = False
                        errors.append(f"Association to candidate step {candidate_step.name}: the specification field [{step_specification.column_name}] is empty.")
                    if step_specification.sheet_name == sample_sheet_name:
                        sample_sheet_matches[row_id].append(match)
                    else:
                        if stitch_dict is not None:
                            stitch_value = str_cast_and_normalize(row_data[stitch_dict[step_specification.sheet_name]])
                            stiched_matches[stitch_value].append(match)
                        else:
                            errors.append(f"Template data not expected to have to be stitched.")
            work_dict[candidate_step] = {row_id: sample_sheet_matches[row_id] + stiched_matches[row_id_to_stitch_dict.get(row_id, "Stitching not required")] for row_id, _ in enumerate(template_sheets[sample_sheet_name].rows)}
        # build the return dict from work dict
        for candidate_step, rows in work_dict.items():
            for row_id, matches in rows.items():
                if all(matches):
                    matching_dict[row_id] = candidate_step
            
        return matching_dict, errors, warnings


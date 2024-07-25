from django.templatetags.static import static
from django.conf import settings

import os
from io import BytesIO
from collections import defaultdict
from openpyxl.reader.excel import load_workbook

from fms_core.coordinates import convert_alpha_digit_coord_to_ordinal
from fms_core.containers import CONTAINER_KIND_SPECS
from fms_core.models import DerivedBySample, Index

SAMPLESHEET_FILE_PATH = static("/samplesheet_templates/SampleSheet_v2.xlsx")

def get_samplesheet(container_kind, placement):
    """
    Prefill a samplesheet V2 using samples index information and return it as a Byte stream.

    Args:
        `container_kind`: The reported container kind sent with the request. Used to calculate lanes.
        `placement`: List holding each lane mapping between the coordinate and the pooled sample occupying the coordinate.
                    exemple: [{"coordinates": "A01", "sample": "1041243"}, {"coordinates": "B01", "sample": "1414432"}, ...]
    
    Returns:
        `samplesheet`: Samplesheet file containing the prefiled samples and index in excel format.
        `errors`     : Errors raised during creation of the samplesheet file.
        `warnings`   : Warnings raised during creation of the samplesheet file.

    """
    out_stream = BytesIO()
    errors = []
    warnings = []

    SAMPLESHEET_SHEET_NAME = "Samplesheet"
    SAMPLESHEET_FIRST_INPUT_ROW = 23

    COLUMN_LANE = 1
    COLUMN_SAMPLE_ALIAS = 2
    COLUMN_INDEX_3PRIME = 3
    COLUMN_INDEX_5PRIME = 4

    row_data_by_lane = defaultdict(list)
    try:
        filename = "/".join(SAMPLESHEET_FILE_PATH.split("/")[-2:]) # Remove the /static/ from the served path to search for local path 
        template_path = os.path.join(settings.STATIC_ROOT, filename)
        workbook = load_workbook(filename=template_path)
        sheet = workbook[SAMPLESHEET_SHEET_NAME]
        container_spec = CONTAINER_KIND_SPECS[container_kind]
        if container_spec is None:
            raise Exception(f'Cannot convert coord to lane number. No ContainerSpec found for container kind "{container_kind}".')
        for lane_info in placement:
            coordinates = lane_info["coordinates"]
            sample_id = lane_info["sample_id"]
            lane = convert_alpha_digit_coord_to_ordinal(coordinates, container_spec.coordinate_spec)
            derived_by_samples = DerivedBySample.objects.filter(sample_id=sample_id)
            values = derived_by_samples.values_list("derived_sample__biosample__alias", "derived_sample__library__index_id")
            for sample_alias, index_id in values:
                if index_id is not None:
                    index = Index.objects.get(id=index_id)
                    sequences_3prime = ", ".join(index.list_3prime_sequences)
                    sequences_5prime = ", ".join(index.list_5prime_sequences)
                    row_data_by_lane[lane].append({COLUMN_LANE: lane, COLUMN_SAMPLE_ALIAS: sample_alias, COLUMN_INDEX_3PRIME: sequences_3prime, COLUMN_INDEX_5PRIME: sequences_5prime})
                else:
                    raise Exception(f'Cannot find index associated to the given samples.')
        ordered_lanes = sorted(row_data_by_lane.keys())
        i = 1
        for lane in ordered_lanes:
            for row_data in row_data_by_lane[lane]:
                sheet.cell(row=SAMPLESHEET_FIRST_INPUT_ROW + i, column=COLUMN_LANE).value = str(row_data[COLUMN_LANE])
                sheet.cell(row=SAMPLESHEET_FIRST_INPUT_ROW + i, column=COLUMN_SAMPLE_ALIAS).value = row_data[COLUMN_SAMPLE_ALIAS]
                sheet.cell(row=SAMPLESHEET_FIRST_INPUT_ROW + i, column=COLUMN_INDEX_3PRIME).value = row_data[COLUMN_INDEX_3PRIME]
                sheet.cell(row=SAMPLESHEET_FIRST_INPUT_ROW + i, column=COLUMN_INDEX_5PRIME).value = row_data[COLUMN_INDEX_5PRIME]
                i = i + 1
    except Exception as err:
        errors.append(err)

    workbook.save(out_stream)
    return out_stream.getvalue(), errors, warnings
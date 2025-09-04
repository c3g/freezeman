import re
from fms_core.template_importer._constants import DESTINATION_CONTAINER_BARCODE_MARKER
from fms_core.services.sample import get_sample_from_container, get_biosample_name
from fms_core.services.samplesheet import fit_sheet_columns_width_to_content

def get_axiom_experiment_barcode_from_comment(comment: str):
    re_comment = rf"{DESTINATION_CONTAINER_BARCODE_MARKER}(\S+)[ ]\."
    m = re.search(re_comment, comment)
    return m.group(1) # first group holds the experiment container barcode

def custom_prefill_8x12_container_biosample_names(workbook_sheet, sheet_info, header_offset, rows_dicts):
    SOURCE_BARCODE_FIELD = "Sample Container Barcode"
    SOURCE_COORDINATE_FIELD = "Sample Container Coord"
    DEST_COORDINATE_FIELD = "QC Container Coord"
    errors = []
    warnings = []
    for sample_info in rows_dicts[0]:
        sample, errors_sample, warnings_sample = get_sample_from_container(barcode=sample_info[SOURCE_BARCODE_FIELD], coordinates=sample_info[SOURCE_COORDINATE_FIELD])
        errors.extend(errors_sample)
        warnings.extend(warnings_sample)
        if sample_info.get(DEST_COORDINATE_FIELD, None) is None:
            errors.append(f"Missing QC container coord for sample {sample.name}. Make sure you completed placement before prefilling.")
        else:
            position = sample_info[DEST_COORDINATE_FIELD]
            row_offset = ord(position[:1])-65
            column_offset = sheet_info["headers"].index(position[1:3])
            biosample_name, errors_biosample, warnings_biosample = get_biosample_name(sample)
            errors.extend(errors_biosample)
            warnings.extend(warnings_biosample)
            workbook_sheet.cell(row=header_offset + row_offset, column=column_offset + 1).value = biosample_name
    fit_sheet_columns_width_to_content(workbook_sheet=workbook_sheet, adjust_factor=2, adjust_offset=6)
    return errors, warnings
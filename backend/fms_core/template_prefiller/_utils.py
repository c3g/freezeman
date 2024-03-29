from fms_core.templates import MAX_HEADER_OFFSET

HEADER_NOT_FOUND = -1

def load_position_dict(workbook, sheets_info, prefill_info):
    """
    Function that return a dictionary that provides offset for sheet headers and offset for columns used during the prefilling process.

    position_dict has the following structure :
    {SHEET_NAME: {header_offset: HEADER_OFFSET, queryset_column_list: [COLUMN_NAME, ...], column_offsets: {COLUMN_NAME: COLUMN_OFFSET, ...}}, ...}
    """
    position_dict = {}
    for sheet in sheets_info:
        column_offsets = {}
        queryset_column_list = []
        sheet_name = sheet["name"]
        sheet_header = sheet["headers"]
        worksheet = workbook[sheet_name]
        sheet_header_offset = find_worksheet_header_offset(worksheet, sheet_header, MAX_HEADER_OFFSET)
        for column_sheet, template_column_name, queryset_column_name, _ in prefill_info:
            if sheet_name == column_sheet:
                column_offsets[template_column_name] = sheet_header.index(template_column_name) + 1
                queryset_column_list.append(queryset_column_name)
        position_dict[sheet_name] = { "header_offset": sheet_header_offset, 
                                      "queryset_column_list": queryset_column_list, 
                                      "column_offsets": column_offsets}
    return position_dict

def find_worksheet_header_offset(worksheet, header_values, max_offset=-1):
    for i, row_values in enumerate(worksheet.iter_rows(min_col=1, max_col=len(header_values), values_only=True), start=2):
        if header_values == [row_value for row_value in row_values if row_value is not None]:
            return i
        elif max_offset >= 0 and i > max_offset:
            return HEADER_NOT_FOUND
    return HEADER_NOT_FOUND
from fms_core.templates import SAMPLE_RENAME_TEMPLATE
from fms_core.workbooks.sample_rename import SampleRenameWorkbook

EXPECTED_HEADERS = [
    'Container Barcode',
    'Container Coordinate',
    'Index Name',
    'Old Sample Name',
    'Old Sample Alias',
    'New Sample Name',
    'New Sample Alias',
]

def test_create_workbook():
    wb = SampleRenameWorkbook(sheets_info=SAMPLE_RENAME_TEMPLATE['sheets info'])
    ws = wb.active
    assert ws is not None
    assert ws.title == "SampleRename"

    assert wb.headers_row_number() == 4

    # Check headers
    for col_num, expected_header in enumerate(EXPECTED_HEADERS, start=1):
        assert ws.cell(row=wb.headers_row_number(), column=col_num).value == expected_header

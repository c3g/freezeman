from fms_core.workbooks.sample_rename import create_workbook

HEADERS = ['Container Barcode', 'Container Coord', 'Index Name', 'Old Sample Name', 'Old Sample Alias', 'New Sample Name', 'New Sample Alias']

validate_templates_values = [
    [
        {
            'Container Barcode': 'CONT1',
            'Container Coord': 'A1',
            'Index Name': 'Index1',
            'Old Sample Name': 'SampleOld',
            'Old Sample Alias': 'SampleAliasOld',
            'New Sample Name': 'SampleNew',
            'New Sample Alias': 'SampleAliasNew',
        },
    ]
]
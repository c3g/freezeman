import datetime
import pytest

from fms_core.models import SampleKind, Taxon
from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.template_importer.importers._generic import BytesIOWithName
from fms_core.template_importer.importers.sample_rename import SampleRenameImporter
from fms_core.tests.test_template_importers._utils import load_template
from fms_core.workbooks.sample_rename import create_workbook, HEADERS_ROW

HEADERS = ['Container Barcode', 'Container Coord', 'Index Name', 'Old Sample Name', 'Old Sample Alias', 'New Sample Name', 'New Sample Alias']

validate_template = [
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

def test_create_workbook():
    wb = create_workbook()
    ws = wb.active
    assert ws is not None
    assert ws.title == "SampleRename"

    # Check headers
    for col_num, header in enumerate(HEADERS, start=1):
        assert ws.cell(row=HEADERS_ROW, column=col_num).value == header

@pytest.mark.django_db
def test_sample_rename():
    importer = SampleRenameImporter()

    wb = create_workbook()
    ws = wb.active
    assert ws is not None # already checked in previous test

    # Create samples
    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    taxon = Taxon.objects.get(name='Homo sapiens')
    container, errors, warnings = create_container(barcode='CONTAINER4SAMPLEQC', kind='Tube', name='Container4SampleQC')
    individual, _, errors, warnings = get_or_create_individual(name='Individual4SampleQC', taxon=taxon)

    for data_row in validate_template[0]:
        create_full_sample(
            name=data_row['Old Sample Name'],
            volume=100,
            concentration=25,
            collection_site='TestCaseSite',
            creation_date=datetime.datetime(2021, 1, 15, 0, 0),
            container=container, individual=individual, sample_kind=sample_kind
        )

    # Template import test
    for row_num, data_row in enumerate(validate_template[0], start=HEADERS_ROW + 1):
        for col_num, header in enumerate(HEADERS, start=1):
            ws.cell(row=row_num, column=col_num).value = data_row[header] # type: ignore    
    
    wb_bytes = BytesIOWithName("sauce_poivre.xslx")
    wb.save(wb_bytes)
    result = load_template(importer=importer, file=wb_bytes)
    assert result['valid'] is True
import datetime
import pytest

from fms_core.containers import CONTAINER_SPEC_TUBE_BOX_9X9
from fms_core.models.sample import Sample
from fms_core.models import SampleKind, Taxon
from fms_core.services.container import create_container, get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.template_importer.importers._generic import BytesIOWithName
from fms_core.template_importer.importers.sample_rename import SampleRenameImporter
from fms_core.tests.test_template_importers._utils import load_template
from fms_core.workbooks.sample_rename import create_workbook, HEADERS_ROW

HEADERS = ['Container Barcode', 'Container Coord', 'Index Name', 'Old Sample Name', 'Old Sample Alias', 'New Sample Name', 'New Sample Alias']

valid_templates = [
    [
        {
            'Container Barcode': 'CONT1',
            'Container Coord': 'A01',
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

@pytest.mark.parametrize("valid_template", valid_templates)
@pytest.mark.django_db
def test_sample_rename(valid_template: list[dict[str, str]]):
    importer = SampleRenameImporter()

    wb = create_workbook()
    ws = wb.active
    assert ws is not None # already checked in previous test, mainly for type checker

    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    taxon = Taxon.objects.get(name='Homo sapiens')
    individual, _, errors, warnings = get_or_create_individual(name='Individual4SampleQC', taxon=taxon)

    for row_num, data_row in enumerate(valid_template, start=HEADERS_ROW + 1):
        for col_num, header in enumerate(HEADERS, start=1):
            # Fill in test data into the workbook
            ws.cell(row=row_num, column=col_num).value = data_row[header]

        parent_container, created_entity, errors, warnings = get_or_create_container(
            barcode=data_row['Container Barcode'],
            kind=CONTAINER_SPEC_TUBE_BOX_9X9.container_kind_id,
            name=data_row['Container Barcode'],
        )
        container, created_entity, errors, warnings = get_or_create_container(
            barcode='YouTube', kind='Tube', name='YouTube',
            container_parent=parent_container,
            coordinates=data_row['Container Coord'],
        )
        if not Sample.objects.filter(name=data_row['Old Sample Name']).exists():
            create_full_sample(
                name=data_row['Old Sample Name'],
                volume=100,
                concentration=25,
                collection_site='TestCaseSite',
                creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                container=container, individual=individual, sample_kind=sample_kind
            )
        
        wb_bytes = BytesIOWithName("sauce_poivre.xlsx")
        wb.save(wb_bytes)
        result = load_template(importer=importer, file=wb_bytes)
        assert result['valid'] is True
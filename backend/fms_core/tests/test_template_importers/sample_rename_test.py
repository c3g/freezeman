import datetime
import pytest

from fms_core.models.derived_by_sample import DerivedBySample
from fms_core.models.platform import Platform
from fms_core.models._constants import DOUBLE_STRANDED
from fms_core.services.library import create_library
from fms_core.models.library_type import LibraryType
from fms_core.services.index import get_or_create_index
from fms_core.containers import CONTAINER_SPEC_TUBE_BOX_9X9
from fms_core.models.sample import Sample
from fms_core.models import SampleKind, Taxon
from fms_core.services.container import create_container, get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.template_importer.importers._generic import BytesIOWithName
from fms_core.template_importer.importers.sample_rename import SampleRenameImporter
from fms_core.tests.test_template_importers._utils import load_template
from fms_core.workbooks.sample_rename import CONTAINER_BARCODE, CONTAINER_COORD, INDEX_NAME, NEW_SAMPLE_ALIAS, NEW_SAMPLE_NAME, OLD_SAMPLE_ALIAS, OLD_SAMPLE_NAME, create_workbook, HEADERS_ROW, HEADERS

def test_create_workbook():
    wb = create_workbook()
    ws = wb.active
    assert ws is not None
    assert ws.title == "SampleRename"

    # Check headers
    for col_num, header in enumerate(HEADERS, start=1):
        assert ws.cell(row=HEADERS_ROW, column=col_num).value == header

valid_templates = [
    [
        # library in a tube in a box
        {
            'Container Barcode': 'CONT1',
            'Container Coord': 'A01',
            'Index Name': 'Index1',
            'Old Sample Name': 'SampleOld',
            'Old Sample Alias': 'SampleAliasOld',
            'New Sample Name': 'SampleNew',
            'New Sample Alias': 'SampleAliasNew',
        },
    ],
    [
        # library in tube
        {
            'Container Barcode': 'CONT1',
            'Container Coord': None,
            'Index Name': 'Index1',
            'Old Sample Name': 'SampleOld',
            'Old Sample Alias': 'SampleAliasOld',
            'New Sample Name': 'SampleNew',
            'New Sample Alias': 'SampleAliasNew',
        },
    ],
    [
        # sample in a tube
        {
            'Container Barcode': 'CONT1',
            'Container Coord': None,
            'Index Name': None,
            'Old Sample Name': 'SampleOld',
            'Old Sample Alias': 'SampleAliasOld',
            'New Sample Name': 'SampleNew',
            'New Sample Alias': 'SampleAliasNew',
        },
    ],
    [
        # rename only alias of sample in a tube
        {
            'Container Barcode': 'CONT1',
            'Container Coord': None,
            'Index Name': None,
            'Old Sample Name': 'SampleOld',
            'Old Sample Alias': 'SampleAliasOld',
            'New Sample Name': None,
            'New Sample Alias': 'SampleAliasNew',
        },
    ],
    [
        # rename only name of sample in a tube
        {
            'Container Barcode': 'CONT1',
            'Container Coord': None,
            'Index Name': None,
            'Old Sample Name': 'SampleOld',
            'Old Sample Alias': 'SampleAliasOld',
            'New Sample Name': 'SampleNew',
            'New Sample Alias': None,
        },
    ],
    [
        # rename only name of sample in a tube without alias provided
        {
            'Container Barcode': 'CONT1',
            'Container Coord': None,
            'Index Name': None,
            'Old Sample Name': 'SampleOld',
            'Old Sample Alias': None,
            'New Sample Name': 'SampleNew',
            'New Sample Alias': None,
        },
    ],
]

@pytest.mark.django_db
@pytest.mark.parametrize("valid_template", valid_templates)
def test_valid_sample_rename(valid_template: list[dict[str, str]]):
    importer = SampleRenameImporter()

    wb = create_workbook()
    ws = wb.active
    assert ws is not None # already checked in previous test, mainly for type checker

    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')

    library_type = LibraryType.objects.get(name="PCR-free")
    platform = Platform.objects.get(name="ILLUMINA")

    for row_num, data_row in enumerate(valid_template, start=HEADERS_ROW + 1):
        for col_num, header in enumerate(HEADERS, start=1):
            # Fill in test data into the workbook
            ws.cell(row=row_num, column=col_num).value = data_row[header]

        parent_container = None
        if data_row['Container Coord']:
            parent_container, *_ = get_or_create_container(
                barcode=data_row['Container Barcode'],
                kind=CONTAINER_SPEC_TUBE_BOX_9X9.container_kind_id,
                name=data_row['Container Barcode'],
            )
            assert parent_container is not None

        child_container_barcode = 'YouTube' if data_row['Container Coord'] else data_row['Container Barcode']
        container, *_ = get_or_create_container(
            barcode=child_container_barcode, kind='Tube', name=child_container_barcode,
            container_parent=parent_container,
            coordinates=data_row['Container Coord'],
        )
        assert container is not None

        library = None
        if data_row['Index Name']:
            index, *_ = get_or_create_index(
                index_name=data_row['Index Name'],
                index_structure="No_Flankers",
            )
            assert index is not None
            library, *_ = create_library(
                library_type=library_type,
                index=index,
                platform=platform,
                strandedness=DOUBLE_STRANDED
            )
            assert library is not None
        
        if not Sample.objects.filter(name=data_row['Old Sample Name']).exists():
            sample, *_ = create_full_sample(
                name=data_row['Old Sample Name'],
                alias=data_row['Old Sample Alias'],
                volume=100,
                concentration=25,
                collection_site='TestCaseSite',
                creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                container=container, individual=individual, sample_kind=sample_kind,
                library=library,
            )
            assert sample is not None
        
        wb_bytes = BytesIOWithName("sauce_poivre.xlsx")
        wb.save(wb_bytes)
        result = load_template(importer=importer, file=wb_bytes)
        assert result['valid'] is True

    dbs = DerivedBySample.objects.all().get()
    for row_num, data_row in enumerate(valid_template, start=HEADERS_ROW + 1):
        if data_row['New Sample Name']:
            assert dbs.sample.name == data_row['New Sample Name']
        if data_row['New Sample Alias']:
            assert dbs.derived_sample.biosample.alias == data_row['New Sample Alias']

@pytest.mark.django_db
def test_double_sample_rename():
    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')

    container, *_ = get_or_create_container(
        barcode="YouTube", kind='Tube'
    )
    assert container is not None

    sample, *_ = create_full_sample(
        name="SampleOldName",
        alias="SampleOldAlias",
        volume=100,
        concentration=25,
        collection_site='TestCaseSite',
        creation_date=datetime.datetime(2021, 1, 15, 0, 0),
        container=container, individual=individual, sample_kind=sample_kind,
    )
    assert sample is not None

    wb = create_workbook()
    ws = wb.active
    assert ws is not None # already checked in previous test, mainly for type checker

    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(CONTAINER_BARCODE) + 1).value = "YouTube"
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(CONTAINER_COORD) + 1).value = None
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(INDEX_NAME) + 1).value = None
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(OLD_SAMPLE_NAME) + 1).value = "SampleOldName"
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(OLD_SAMPLE_ALIAS) + 1).value = "SampleOldAlias"
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(NEW_SAMPLE_NAME) + 1).value = f"SampleNewName"
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(NEW_SAMPLE_ALIAS) + 1).value = f"SampleNewAlias"

    ws.cell(row=HEADERS_ROW + 2, column=HEADERS.index(CONTAINER_BARCODE) + 1).value = "YouTube"
    ws.cell(row=HEADERS_ROW + 2, column=HEADERS.index(CONTAINER_COORD) + 1).value = None
    ws.cell(row=HEADERS_ROW + 2, column=HEADERS.index(INDEX_NAME) + 1).value = None
    ws.cell(row=HEADERS_ROW + 2, column=HEADERS.index(OLD_SAMPLE_NAME) + 1).value = "SampleNewName"
    ws.cell(row=HEADERS_ROW + 2, column=HEADERS.index(OLD_SAMPLE_ALIAS) + 1).value = "SampleNewAlias"
    ws.cell(row=HEADERS_ROW + 2, column=HEADERS.index(NEW_SAMPLE_NAME) + 1).value = f"SampleNewNewName"
    ws.cell(row=HEADERS_ROW + 2, column=HEADERS.index(NEW_SAMPLE_ALIAS) + 1).value = f"SampleNewNewAlias"

    wb_bytes = BytesIOWithName("sauce_poivre.xlsx")
    wb.save(wb_bytes)

    importer = SampleRenameImporter()
    result = load_template(importer=importer, file=wb_bytes)
    
    assert result['valid'] is True
    assert not DerivedBySample.objects.filter(sample__name="SampleNewName", derived_sample__biosample__alias="SampleNewAlias").exists()
    assert DerivedBySample.objects.filter(sample__name="SampleNewNewName", derived_sample__biosample__alias="SampleNewNewAlias").exists()

@pytest.mark.django_db
def test_nonexistent_sample_rename():
    importer = SampleRenameImporter()

    wb = create_workbook()
    ws = wb.active
    assert ws is not None # already checked in previous test, mainly for type checker

    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(CONTAINER_BARCODE) + 1).value = "NonExistentContainer"
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(CONTAINER_COORD) + 1).value = None
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(INDEX_NAME) + 1).value = None
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(OLD_SAMPLE_NAME) + 1).value = "NonExistentSample"
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(OLD_SAMPLE_ALIAS) + 1).value = "NonExistentAlias"
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(NEW_SAMPLE_NAME) + 1).value = f"SampleNewName"
    ws.cell(row=HEADERS_ROW + 1, column=HEADERS.index(NEW_SAMPLE_ALIAS) + 1).value = f"SampleNewAlias"

    wb_bytes = BytesIOWithName("sauce_poivre.xlsx")
    wb.save(wb_bytes)
    result = load_template(importer=importer, file=wb_bytes)
    assert result['valid'] is False
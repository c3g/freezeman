import datetime
from io import BytesIO
import pytest

from django.core.files.uploadedfile import SimpleUploadedFile

from fms_core.models.derived_by_sample import DerivedBySample
from fms_core.models.platform import Platform
from fms_core.models._constants import DOUBLE_STRANDED
from fms_core.services.library import create_library
from fms_core.models.library_type import LibraryType
from fms_core.services.index import get_or_create_index
from fms_core.models import SampleKind
from fms_core.services.container import get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.template_importer.importers.sample_rename import SampleRenameImporter
from fms_core.templates import SAMPLE_RENAME_TEMPLATE
from fms_core.tests.test_template_importers._utils import load_template
from fms_core.workbooks.sample_rename import SampleRenameWorkbook

def create_workbook():
    return SampleRenameWorkbook(sheets_info=SAMPLE_RENAME_TEMPLATE['sheets info'])

HEADER_CONTAINER_BARCODE = 'Container Barcode'
HEADER_CONTAINER_COORD = 'Container Coordinate'
HEADER_INDEX_NAME = 'Index Name'
HEADER_OLD_SAMPLE_NAME = 'Old Sample Name'
HEADER_OLD_SAMPLE_ALIAS = 'Old Sample Alias'
HEADER_NEW_SAMPLE_NAME = 'New Sample Name'
HEADER_NEW_SAMPLE_ALIAS = 'New Sample Alias'

def test_create_workbook():
    wb = create_workbook()
    ws = wb.active
    assert ws is not None
    assert ws.title == "SampleRename"

    # Check headers
    for col_num, header in enumerate(wb.headers(), start=1):
        assert ws.cell(row=wb.headers_row_number(), column=col_num).value == header

@pytest.mark.django_db
@pytest.mark.parametrize("valid_data_row", [
    # library in tube
    {
        HEADER_CONTAINER_BARCODE: 'YOUTUBE',
        HEADER_CONTAINER_COORD: None,
        HEADER_INDEX_NAME: 'Index1',
        HEADER_OLD_SAMPLE_NAME: None,
        HEADER_OLD_SAMPLE_ALIAS: None,
        HEADER_NEW_SAMPLE_NAME: 'SampleNew',
        HEADER_NEW_SAMPLE_ALIAS: 'SampleAliasNew',
    },
    # sample in a tube
    {
        HEADER_CONTAINER_BARCODE: 'YOUTUBE',
        HEADER_CONTAINER_COORD: None,
        HEADER_INDEX_NAME: None,
        HEADER_OLD_SAMPLE_NAME: 'SampleOld',
        HEADER_OLD_SAMPLE_ALIAS: 'SampleAliasOld',
        HEADER_NEW_SAMPLE_NAME: 'SampleNew',
        HEADER_NEW_SAMPLE_ALIAS: 'SampleAliasNew',
    },
    # rename only alias of sample in a tube
    {
        HEADER_CONTAINER_BARCODE: 'YOUTUBE',
        HEADER_CONTAINER_COORD: None,
        HEADER_INDEX_NAME: None,
        HEADER_OLD_SAMPLE_NAME: 'SampleOld',
        HEADER_OLD_SAMPLE_ALIAS: 'SampleAliasOld',
        HEADER_NEW_SAMPLE_NAME: None,
        HEADER_NEW_SAMPLE_ALIAS: 'SampleAliasNew',
    },

    # rename only name of sample in a tube
    {
        HEADER_CONTAINER_BARCODE: 'YOUTUBE',
        HEADER_CONTAINER_COORD: None,
        HEADER_INDEX_NAME: None,
        HEADER_OLD_SAMPLE_NAME: 'SampleOld',
        HEADER_OLD_SAMPLE_ALIAS: 'SampleAliasOld',
        HEADER_NEW_SAMPLE_NAME: 'SampleNew',
        HEADER_NEW_SAMPLE_ALIAS: None,
    },
    # rename only name of sample in a tube without alias provided
    {
        HEADER_CONTAINER_BARCODE: 'YOUTUBE',
        HEADER_CONTAINER_COORD: None,
        HEADER_INDEX_NAME: None,
        HEADER_OLD_SAMPLE_NAME: 'SampleOld',
        HEADER_OLD_SAMPLE_ALIAS: None,
        HEADER_NEW_SAMPLE_NAME: 'SampleNew',
        HEADER_NEW_SAMPLE_ALIAS: None,
    },
])
def test_valid_sample_rename(valid_data_row: dict[str, str]):
    importer = SampleRenameImporter()

    wb = create_workbook()

    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')

    library_type = LibraryType.objects.get(name="PCR-free")
    platform = Platform.objects.get(name="ILLUMINA")

    set_worksheet_rows(wb, [valid_data_row])

    container, *_ = get_or_create_container(
        barcode="YOUTUBE", kind='Tube', name="YOUTUBE",
        coordinates=None,
    ); assert container is not None # for the type checker

    index, *_ = get_or_create_index(
        index_name='Index1',
        index_structure="No_Flankers",
    ); assert index is not None
    library, *_ = create_library(
        library_type=library_type,
        index=index,
        platform=platform,
        strandedness=DOUBLE_STRANDED
    ); assert library is not None # for the type checker
    
    create_full_sample(
        name='SampleOld',
        alias='SampleAliasOld',
        volume=100,
        concentration=25,
        collection_site='TestCaseSite',
        creation_date=datetime.datetime(2021, 1, 15, 0, 0),
        container=container, individual=individual, sample_kind=sample_kind,
        library=library,
    )
        
    wb_bytes = BytesIO()
    wb.save(wb_bytes)
    wb_bytes.seek(0)
    result = load_template(importer=importer, file=SimpleUploadedFile(name="sauce_poivre.xlsx", content=wb_bytes.read()))
    wb_bytes.close()
    assert result['valid'] is True

    derived_by_sample = DerivedBySample.objects.all().get()

    if valid_data_row[HEADER_NEW_SAMPLE_NAME]:
        assert derived_by_sample.sample.name == valid_data_row[HEADER_NEW_SAMPLE_NAME]
    if valid_data_row[HEADER_NEW_SAMPLE_ALIAS]:
        assert derived_by_sample.derived_sample.biosample.alias == valid_data_row[HEADER_NEW_SAMPLE_ALIAS]

@pytest.mark.django_db
def test_double_sample_rename():
    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')

    TUBE_BARCODE = "YouTube"
    container, *_ = get_or_create_container(
        barcode=TUBE_BARCODE, kind='Tube'
    ); assert container is not None

    sample, *_ = create_full_sample(
        name="SampleOldName",
        alias="SampleOldAlias",
        volume=100,
        concentration=25,
        collection_site='TestCaseSite',
        creation_date=datetime.datetime(2021, 1, 15, 0, 0),
        container=container, individual=individual, sample_kind=sample_kind,
    ); assert sample is not None

    wb = create_workbook()

    TEMPLATE = [
        # row 1
        {
            HEADER_CONTAINER_BARCODE: TUBE_BARCODE,
            HEADER_CONTAINER_COORD: None,
            HEADER_INDEX_NAME: None,
            HEADER_OLD_SAMPLE_NAME: "SampleOldName",
            HEADER_OLD_SAMPLE_ALIAS: "SampleOldAlias",
            HEADER_NEW_SAMPLE_NAME: f"SampleNewName",
            HEADER_NEW_SAMPLE_ALIAS: f"SampleNewAlias",
        },
        # row 2
        {
            HEADER_CONTAINER_BARCODE: TUBE_BARCODE,
            HEADER_CONTAINER_COORD: None,
            HEADER_INDEX_NAME: None,
            HEADER_OLD_SAMPLE_NAME: "SampleNewName",
            HEADER_OLD_SAMPLE_ALIAS: "SampleNewAlias",
            HEADER_NEW_SAMPLE_NAME: f"SampleNewNewName",
            HEADER_NEW_SAMPLE_ALIAS: f"SampleNewNewAlias",
        }
    ]
    set_worksheet_rows(wb, TEMPLATE)

    importer = SampleRenameImporter()
    wb_bytes = BytesIO()
    wb.save(wb_bytes)
    wb_bytes.seek(0)
    result = load_template(importer=importer, file=SimpleUploadedFile(name="sauce_poivre.xlsx", content=wb_bytes.read()))
    wb_bytes.close()
    
    assert result['valid'] is True
    assert not DerivedBySample.objects.filter(sample__name="SampleNewName", derived_sample__biosample__alias="SampleNewAlias").exists()
    assert DerivedBySample.objects.filter(sample__name="SampleNewNewName", derived_sample__biosample__alias="SampleNewNewAlias").exists()

@pytest.mark.django_db
def test_nonexistent_sample_rename():
    importer = SampleRenameImporter()

    wb = create_workbook(); ws = wb.active; assert ws is not None
    set_worksheet_rows(wb, [
        {
            HEADER_CONTAINER_BARCODE: "NonExistentContainer",
            HEADER_CONTAINER_COORD: None,
            HEADER_INDEX_NAME: None,
            HEADER_OLD_SAMPLE_NAME: "NonExistentSample",
            HEADER_OLD_SAMPLE_ALIAS: "NonExistentAlias",
            HEADER_NEW_SAMPLE_NAME: f"SampleNewName",
            HEADER_NEW_SAMPLE_ALIAS: f"SampleNewAlias",
        }
    ])
    wb_bytes = BytesIO()
    wb.save(wb_bytes)
    wb_bytes.seek(0)
    file = SimpleUploadedFile(name="sauce_poivre.xlsx", content=wb_bytes.read())

    # Sample and container does not exist
    result = load_template(importer=importer, file=file)
    assert result['valid'] is False

    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')
    
    # Container exists but it contains a differently-named sample
    container, *_ = get_or_create_container(barcode="NonExistentContainer", kind='Tube', name="NonExistentContainer",); assert container is not None
    sample, *_ = create_full_sample(
        name="NonExistentSample1",
        alias="NonExistentAlias",
        volume=100,
        concentration=25,
        collection_site='TestCaseSite',
        creation_date=datetime.datetime(2021, 1, 15, 0, 0),
        container=container, individual=individual, sample_kind=sample_kind,
    ); assert sample is not None

    result = load_template(importer=importer, file=file)
    assert result['valid'] is False

    # Sample exists but it is in a different container
    container2, *_ = get_or_create_container(barcode="AnotherContainer", kind='Tube', name="AnotherContainer",); assert container2 is not None
    sample, *_ = create_full_sample(
        name="NonExistentSample",
        alias="NonExistentAlias",
        volume=100,
        concentration=25,
        collection_site='TestCaseSite',
        creation_date=datetime.datetime(2021, 1, 15, 0, 0),
        container=container2, individual=individual, sample_kind=sample_kind,
    ); assert sample is not None

    result = load_template(importer=importer, file=file)
    assert result['valid'] is False

def set_worksheet_rows(wb: SampleRenameWorkbook, data: list[dict]):
    wb.set_rows(start_row_num=wb.headers_row_number() + 1, rows_data=data)

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
from fms_core.containers import CONTAINER_SPEC_TUBE_BOX_9X9
from fms_core.models.sample import Sample
from fms_core.models import SampleKind, Taxon
from fms_core.services.container import create_container, get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.template_importer.importers.sample_rename import SampleRenameImporter
from fms_core.tests.test_template_importers._utils import load_template
from fms_core.workbooks.sample_rename import HeaderNames, create_workbook, HEADERS_ROW, HEADERS, header_to_column

def test_create_workbook():
    wb = create_workbook()
    ws = wb.active
    assert ws is not None
    assert ws.title == "SampleRename"

    # Check headers
    for col_num, header in enumerate(HEADERS, start=1):
        assert ws.cell(row=HEADERS_ROW, column=col_num).value == header

@pytest.mark.django_db
@pytest.mark.parametrize("valid_data_row", [
    # library in tube
    {
        HeaderNames.CONTAINER_BARCODE: 'YOUTUBE',
        HeaderNames.CONTAINER_COORD: None,
        HeaderNames.INDEX_NAME: 'Index1',
        HeaderNames.OLD_SAMPLE_NAME: None,
        HeaderNames.OLD_SAMPLE_ALIAS: None,
        HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
        HeaderNames.NEW_SAMPLE_ALIAS: 'SampleAliasNew',
    },
    # sample in a tube
    {
        HeaderNames.CONTAINER_BARCODE: 'YOUTUBE',
        HeaderNames.CONTAINER_COORD: None,
        HeaderNames.INDEX_NAME: None,
        HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
        HeaderNames.OLD_SAMPLE_ALIAS: 'SampleAliasOld',
        HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
        HeaderNames.NEW_SAMPLE_ALIAS: 'SampleAliasNew',
    },
    # rename only alias of sample in a tube
    {
        HeaderNames.CONTAINER_BARCODE: 'YOUTUBE',
        HeaderNames.CONTAINER_COORD: None,
        HeaderNames.INDEX_NAME: None,
        HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
        HeaderNames.OLD_SAMPLE_ALIAS: 'SampleAliasOld',
        HeaderNames.NEW_SAMPLE_NAME: None,
        HeaderNames.NEW_SAMPLE_ALIAS: 'SampleAliasNew',
    },

    # rename only name of sample in a tube
    {
        HeaderNames.CONTAINER_BARCODE: 'YOUTUBE',
        HeaderNames.CONTAINER_COORD: None,
        HeaderNames.INDEX_NAME: None,
        HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
        HeaderNames.OLD_SAMPLE_ALIAS: 'SampleAliasOld',
        HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
        HeaderNames.NEW_SAMPLE_ALIAS: None,
    },
    # rename only name of sample in a tube without alias provided
    {
        HeaderNames.CONTAINER_BARCODE: 'YOUTUBE',
        HeaderNames.CONTAINER_COORD: None,
        HeaderNames.INDEX_NAME: None,
        HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
        HeaderNames.OLD_SAMPLE_ALIAS: None,
        HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
        HeaderNames.NEW_SAMPLE_ALIAS: None,
    },
])
def test_valid_sample_rename(valid_data_row: dict[str, str]):
    importer = SampleRenameImporter()

    wb = create_workbook()
    ws = wb.active; assert ws is not None # for type-checker

    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')

    library_type = LibraryType.objects.get(name="PCR-free")
    platform = Platform.objects.get(name="ILLUMINA")

    set_worksheet_rows(ws, [valid_data_row])

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

    if valid_data_row[HeaderNames.NEW_SAMPLE_NAME]:
        assert derived_by_sample.sample.name == valid_data_row[HeaderNames.NEW_SAMPLE_NAME]
    if valid_data_row[HeaderNames.NEW_SAMPLE_ALIAS]:
        assert derived_by_sample.derived_sample.biosample.alias == valid_data_row[HeaderNames.NEW_SAMPLE_ALIAS]

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
    ws = wb.active; assert ws is not None

    TEMPLATE = [
        # row 1
        {
            HeaderNames.CONTAINER_BARCODE: TUBE_BARCODE,
            HeaderNames.CONTAINER_COORD: None,
            HeaderNames.INDEX_NAME: None,
            HeaderNames.OLD_SAMPLE_NAME: "SampleOldName",
            HeaderNames.OLD_SAMPLE_ALIAS: "SampleOldAlias",
            HeaderNames.NEW_SAMPLE_NAME: f"SampleNewName",
            HeaderNames.NEW_SAMPLE_ALIAS: f"SampleNewAlias",
        },
        # row 2
        {
            HeaderNames.CONTAINER_BARCODE: TUBE_BARCODE,
            HeaderNames.CONTAINER_COORD: None,
            HeaderNames.INDEX_NAME: None,
            HeaderNames.OLD_SAMPLE_NAME: "SampleNewName",
            HeaderNames.OLD_SAMPLE_ALIAS: "SampleNewAlias",
            HeaderNames.NEW_SAMPLE_NAME: f"SampleNewNewName",
            HeaderNames.NEW_SAMPLE_ALIAS: f"SampleNewNewAlias",
        }
    ]
    set_worksheet_rows(ws, TEMPLATE)

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

    set_worksheet_rows(ws, [
        {
            HeaderNames.CONTAINER_BARCODE: "NonExistentContainer",
            HeaderNames.CONTAINER_COORD: None,
            HeaderNames.INDEX_NAME: None,
            HeaderNames.OLD_SAMPLE_NAME: "NonExistentSample",
            HeaderNames.OLD_SAMPLE_ALIAS: "NonExistentAlias",
            HeaderNames.NEW_SAMPLE_NAME: f"SampleNewName",
            HeaderNames.NEW_SAMPLE_ALIAS: f"SampleNewAlias",
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

def set_worksheet_rows(ws, template: list[dict]):
    for row_num, row_test_data in enumerate(template, HEADERS_ROW + 1):
        for col_name, col_test_data in row_test_data.items():
            ws.cell(row=row_num, column=header_to_column(col_name)).value = col_test_data

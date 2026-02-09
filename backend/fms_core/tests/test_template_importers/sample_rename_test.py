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
@pytest.mark.parametrize("valid_template", [
    [
        # library in a tube in a box
        {
            HeaderNames.CONTAINER_BARCODE: 'CONT1',
            HeaderNames.CONTAINER_COORD: 'A01',
            HeaderNames.INDEX_NAME: 'Index1',
            HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
            HeaderNames.OLD_SAMPLE_ALIAS: 'SampleAliasOld',
            HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
            HeaderNames.NEW_SAMPLE_ALIAS: 'SampleAliasNew',
        },
    ],
    [
        # library in tube
        {
            HeaderNames.CONTAINER_BARCODE: 'CONT1',
            HeaderNames.CONTAINER_COORD: None,
            HeaderNames.INDEX_NAME: 'Index1',
            HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
            HeaderNames.OLD_SAMPLE_ALIAS: 'SampleAliasOld',
            HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
            HeaderNames.NEW_SAMPLE_ALIAS: 'SampleAliasNew',
        },
    ],
    [
        # sample in a tube
        {
            HeaderNames.CONTAINER_BARCODE: 'CONT1',
            HeaderNames.CONTAINER_COORD: None,
            HeaderNames.INDEX_NAME: None,
            HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
            HeaderNames.OLD_SAMPLE_ALIAS: 'SampleAliasOld',
            HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
            HeaderNames.NEW_SAMPLE_ALIAS: 'SampleAliasNew',
        },
    ],
    [
        # rename only alias of sample in a tube
        {
            HeaderNames.CONTAINER_BARCODE: 'CONT1',
            HeaderNames.CONTAINER_COORD: None,
            HeaderNames.INDEX_NAME: None,
            HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
            HeaderNames.OLD_SAMPLE_ALIAS: 'SampleAliasOld',
            HeaderNames.NEW_SAMPLE_NAME: None,
            HeaderNames.NEW_SAMPLE_ALIAS: 'SampleAliasNew',
        },
    ],
    [
        # rename only name of sample in a tube
        {
            HeaderNames.CONTAINER_BARCODE: 'CONT1',
            HeaderNames.CONTAINER_COORD: None,
            HeaderNames.INDEX_NAME: None,
            HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
            HeaderNames.OLD_SAMPLE_ALIAS: 'SampleAliasOld',
            HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
            HeaderNames.NEW_SAMPLE_ALIAS: None,
        },
    ],
    [
        # rename only name of sample in a tube without alias provided
        {
            HeaderNames.CONTAINER_BARCODE: 'CONT1',
            HeaderNames.CONTAINER_COORD: None,
            HeaderNames.INDEX_NAME: None,
            HeaderNames.OLD_SAMPLE_NAME: 'SampleOld',
            HeaderNames.OLD_SAMPLE_ALIAS: None,
            HeaderNames.NEW_SAMPLE_NAME: 'SampleNew',
            HeaderNames.NEW_SAMPLE_ALIAS: None,
        },
    ],
])
def test_valid_sample_rename(valid_template: list[dict[str, str]]):
    importer = SampleRenameImporter()

    wb = create_workbook()
    ws = wb.active; assert ws is not None

    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')

    library_type = LibraryType.objects.get(name="PCR-free")
    platform = Platform.objects.get(name="ILLUMINA")

    for row_num, data_row in enumerate(valid_template, start=HEADERS_ROW + 1):
        for col_num, header in enumerate(HEADERS, start=1):
            # Fill in test data into the workbook
            ws.cell(row=row_num, column=col_num).value = data_row[header]

        parent_container = None
        if data_row[HeaderNames.CONTAINER_COORD]:
            parent_container, *_ = get_or_create_container(
                barcode=data_row[HeaderNames.CONTAINER_BARCODE],
                kind=CONTAINER_SPEC_TUBE_BOX_9X9.container_kind_id,
                name=data_row[HeaderNames.CONTAINER_BARCODE],
            ); assert parent_container is not None

        child_container_barcode = 'YouTube' if data_row[HeaderNames.CONTAINER_COORD] else data_row[HeaderNames.CONTAINER_BARCODE]
        container, *_ = get_or_create_container(
            barcode=child_container_barcode, kind='Tube', name=child_container_barcode,
            container_parent=parent_container,
            coordinates=data_row[HeaderNames.CONTAINER_COORD],
        ); assert container is not None

        library = None
        if data_row[HeaderNames.INDEX_NAME]:
            index, *_ = get_or_create_index(
                index_name=data_row[HeaderNames.INDEX_NAME],
                index_structure="No_Flankers",
            ); assert index is not None
            library, *_ = create_library(
                library_type=library_type,
                index=index,
                platform=platform,
                strandedness=DOUBLE_STRANDED
            ); assert library is not None
        
        if not Sample.objects.filter(name=data_row[HeaderNames.OLD_SAMPLE_NAME]).exists():
            sample, *_ = create_full_sample(
                name=data_row[HeaderNames.OLD_SAMPLE_NAME],
                alias=data_row[HeaderNames.OLD_SAMPLE_ALIAS],
                volume=100,
                concentration=25,
                collection_site='TestCaseSite',
                creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                container=container, individual=individual, sample_kind=sample_kind,
                library=library,
            ); assert sample is not None
        
        wb_bytes = BytesIOWithName("sauce_poivre.xlsx")
        wb.save(wb_bytes)
        result = load_template(importer=importer, file=wb_bytes)
        assert result['valid'] is True

    dbs = DerivedBySample.objects.all().get()
    for row_num, data_row in enumerate(valid_template, start=HEADERS_ROW + 1):
        if data_row[HeaderNames.NEW_SAMPLE_NAME]:
            assert dbs.sample.name == data_row[HeaderNames.NEW_SAMPLE_NAME]
        if data_row[HeaderNames.NEW_SAMPLE_ALIAS]:
            assert dbs.derived_sample.biosample.alias == data_row[HeaderNames.NEW_SAMPLE_ALIAS]

@pytest.mark.django_db
def test_double_sample_rename():
    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')

    container, *_ = get_or_create_container(
        barcode="YouTube", kind='Tube'
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

    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.CONTAINER_BARCODE)).value = "YouTube"
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.CONTAINER_COORD)).value = None
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.INDEX_NAME)).value = None
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.OLD_SAMPLE_NAME)).value = "SampleOldName"
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.OLD_SAMPLE_ALIAS)).value = "SampleOldAlias"
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.NEW_SAMPLE_NAME)).value = f"SampleNewName"
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.NEW_SAMPLE_ALIAS)).value = f"SampleNewAlias"

    ws.cell(row=HEADERS_ROW + 2, column=header_to_column(HeaderNames.CONTAINER_BARCODE)).value = "YouTube"
    ws.cell(row=HEADERS_ROW + 2, column=header_to_column(HeaderNames.CONTAINER_COORD)).value = None
    ws.cell(row=HEADERS_ROW + 2, column=header_to_column(HeaderNames.INDEX_NAME)).value = None
    ws.cell(row=HEADERS_ROW + 2, column=header_to_column(HeaderNames.OLD_SAMPLE_NAME)).value = "SampleNewName"
    ws.cell(row=HEADERS_ROW + 2, column=header_to_column(HeaderNames.OLD_SAMPLE_ALIAS)).value = "SampleNewAlias"
    ws.cell(row=HEADERS_ROW + 2, column=header_to_column(HeaderNames.NEW_SAMPLE_NAME)).value = f"SampleNewNewName"
    ws.cell(row=HEADERS_ROW + 2, column=header_to_column(HeaderNames.NEW_SAMPLE_ALIAS)).value = f"SampleNewNewAlias"

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

    wb = create_workbook(); ws = wb.active; assert ws is not None

    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.CONTAINER_BARCODE)).value = "NonExistentContainer"
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.CONTAINER_COORD)).value = None
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.INDEX_NAME)).value = None
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.OLD_SAMPLE_NAME)).value = "NonExistentSample"
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.OLD_SAMPLE_ALIAS)).value = "NonExistentAlias"
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.NEW_SAMPLE_NAME)).value = f"SampleNewName"
    ws.cell(row=HEADERS_ROW + 1, column=header_to_column(HeaderNames.NEW_SAMPLE_ALIAS)).value = f"SampleNewAlias"

    wb_bytes = BytesIOWithName("sauce_poivre.xlsx")
    wb.save(wb_bytes)

    # Sample and container does not exist
    result = load_template(importer=importer, file=wb_bytes)
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

    result = load_template(importer=importer, file=wb_bytes)
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

    result = load_template(importer=importer, file=wb_bytes)
    assert result['valid'] is False
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

def set_worksheet_rows(wb: SampleRenameWorkbook, data: list[dict]):
    wb.set_rows(start_row_num=wb.headers_row_number() + 1, rows_data=data)

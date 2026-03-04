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
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

HEADER_CONTAINER_BARCODE = 'Container Barcode'
HEADER_CONTAINER_COORD = 'Container Coordinate'
HEADER_INDEX_NAME = 'Index Name'
HEADER_OLD_SAMPLE_NAME = 'Old Sample Name'
HEADER_OLD_SAMPLE_ALIAS = 'Old Sample Alias'
HEADER_NEW_SAMPLE_NAME = 'New Sample Name'
HEADER_NEW_SAMPLE_ALIAS = 'New Sample Alias'

valid_templates = [
    "Sample_Rename_v5_6_0_double_rename.xlsx",
]
invalid_templates = [
    "Sample_Rename_v5_6_0_multiple_samples.xlsx",
    "Sample_Rename_v5_6_0_no_sample.xlsx",
]

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

    result = load_template(importer=SampleRenameImporter(), file=APP_DATA_ROOT / "Sample_Rename_v5_6_0_double_rename.xlsx")

    assert result['valid'] is True
    assert not DerivedBySample.objects.filter(sample__name="SampleNewName", derived_sample__biosample__alias="SampleNewAlias").exists()
    assert DerivedBySample.objects.filter(sample__name="SampleNewNewName", derived_sample__biosample__alias="SampleNewNewAlias").exists()

@pytest.mark.django_db
def test_no_sample_to_rename():
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

    result = load_template(importer=SampleRenameImporter(), file=TEST_DATA_ROOT / "Sample_Rename_v5_6_0_no_sample.xlsx")

    assert result['valid'] is False
    assert result['result_previews'][0]['rows'][0]['validation_error'].messages == ["No sample found with the criteria provided; please refine your criteria."]

@pytest.mark.django_db
def test_multiple_sample_found_when_renaming():
    sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
    individual, *_ = get_or_create_individual(name='IndividualOfJustice')


    for i in range(2):
        TUBE_BARCODE = f"YouTube_{i}"
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

    result = load_template(importer=SampleRenameImporter(), file=TEST_DATA_ROOT / "Sample_Rename_v5_6_0_multiple_samples.xlsx")

    assert result['valid'] is False
    assert result['result_previews'][0]['rows'][0]['validation_error'].messages == ["2 samples found with the provided criteria to rename; please refine your criteria."]

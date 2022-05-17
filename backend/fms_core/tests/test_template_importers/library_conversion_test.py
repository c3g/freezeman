from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import LibraryPreparationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import SampleKind, LibraryType, Platform, Index, ProcessMeasurement, PropertyType, PropertyValue
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample, get_sample_from_container, update_qc_flags


class LibraryConversionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = LibraryPreparationImporter()
        self.file = APP_DATA_ROOT / "Library_conversion_v3_9_0.xlsx"
        ContentType.objects.clear_cache()

        self.source_sample_name = 'sample_source'
        self.source_sample_initial_volume = 100
        self.source_sample_container_barcode = 'SOURCECONTAINER4LIBRARYCONVERSION'

        self.platform = Platform.objects.get(name="DNBSEQ")

        self.library_batch_1 = dict(
            ID='batch_1',
            date='2022-04-16',
            platform=self.platform,
            batch_comment='Library Batch Comment',
            technician_name='Tony Tir',
            kit_used='Illumina Tagmentation',
            kit_lot='1',
            thermocycler_used='Biometra Rouge',
        )

        self.library_batch_2 = dict(
            ID='batch_2',
            date='2022-04-17',
            platform=self.platform,
            batch_comment='Library Batch Comment 2',
            technician_name='Janick St-Cyr',
            kit_used='Lucigen NXSEQ AMPFREE',
            kit_lot='2',
        )

        self.library_1 = dict(
            **self.library_batch_1,
            library_source_container_barcode='Container4LibrarySource1',
            library_source_container_name='Container4LibrarySource1',
            library_source_container_kind='Tube',
            library_destination_container_barcode='Container4LibraryDest1',
            library_destination_container_coord='A01',
            library_destination_container_name='Container4LibraryDest1',
            library_destination_container_kind='Tube',
            volume_used=2,
            library_volume=2,
            library_size=20,
            library_comment='Library 1 Comment'
        )

        self.library_2 = dict(
            **self.library_batch_1,
            library_source_container_barcode='Container4LibrarySource2',
            library_source_container_name='Container4LibrarySource2',
            library_source_container_kind='Tube',
            library_destination_container_barcode='Container4LibraryDest2',
            library_destination_container_coord='A02',
            library_destination_container_name='Container4LibraryDest2',
            library_destination_container_kind='Tube',
            volume_used=4,
            library_volume=3,
            library_comment='Library 2 Comment'
        )

        self.library_3 = dict(
            **self.library_batch_2,
            library_source_container_barcode='Container4LibrarySource3',
            library_source_container_name='Container4LibrarySource3',
            library_source_container_kind='Tube',
            library_destination_container_barcode='Container4LibraryDest3',
            library_destination_container_coord='A03',
            library_destination_container_name='Container4LibraryDest3',
            library_destination_container_kind='Tube',
            volume_used=5,
            library_volume=5,
            library_comment='Library 3 Comment'
        )

        self.prefill_data()

    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container, errors, warnings) = create_container(barcode=self.source_sample_container_barcode,
                                                         kind='Tube',
                                                         name='Container4LibraryPrep')

        (source_sample, errors, warnings) = \
            create_full_sample(name=self.source_sample_name, volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container, sample_kind=sample_kind)

        update_qc_flags(source_sample, "Passed", "Passed")

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Test source sample
        source_sample, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode)
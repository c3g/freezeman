from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import SampleMetadataImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, SampleKind, SampleMetadata

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample


class SampleMetadataTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleMetadataImporter()
        self.file = APP_DATA_ROOT / "Sample_metadata_v3_14_0.xlsx"
        ContentType.objects.clear_cache()

        self.sample1_name = 'SampleTestMetadata'
        self.sample2_name = 'Sample2TestMetadata'
        self.sample_metadata1_name = "metadata_name_1"
        self.sample_metadata1_value = "MetadataValue1"
        self.sample_metadata2_name = "metadata_name_2"
        self.sample_metadata2_value = "MetadataValue2"
        self.sample_metadata3_name = "metadataname3"
        self.sample_metadata3_value = "MetadataValue3"
        self.sample_metadata4_value = "MetadataValue4"
        self.sample_metadata5_value = "MetadataValue5"
        self.prefill_data()


    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        # Sample 1
        (container, errors, warnings) = create_container(barcode='CONTAINER4METADATA', kind='Tube', name='Container4Metadata')

        create_full_sample(name=self.sample1_name, volume=100, concentration=25, collection_site='TestCaseSite',
                           creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                           container=container, sample_kind=sample_kind)

        # Sample 2
        (container2, errors, warnings) = create_container(barcode='CONTAINER4METADATA2', kind='Tube',
                                                          name='Container4Metadata2')

        create_full_sample(name=self.sample2_name, volume=100, concentration=25, collection_site='TestCaseSite',
                           creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                           container=container2, sample_kind=sample_kind)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Sample 1 information tests
        sample = Sample.objects.get(name=self.sample1_name)
        metadata1 = SampleMetadata.objects.get(name=self.sample_metadata1_name, biosample=sample.biosample_not_pool)
        metadata2 = SampleMetadata.objects.get(name=self.sample_metadata2_name, biosample=sample.biosample_not_pool)
        metadata3 = SampleMetadata.objects.get(name=self.sample_metadata3_name, biosample=sample.biosample_not_pool)

        self.assertEqual(metadata1.biosample, sample.biosample_not_pool)
        self.assertEqual(metadata1.value, self.sample_metadata1_value)
        self.assertEqual(metadata2.value, self.sample_metadata2_value)
        self.assertEqual(metadata3.value, self.sample_metadata3_value)

        # Sample 2 information tests
        sample2 = Sample.objects.get(name=self.sample2_name)
        metadata4 = SampleMetadata.objects.get(name=self.sample_metadata1_name, biosample=sample2.biosample_not_pool)
        metadata5 = SampleMetadata.objects.get(name=self.sample_metadata3_name, biosample=sample2.biosample_not_pool)

        self.assertEqual(metadata1.biosample, sample.biosample_not_pool)
        self.assertEqual(metadata4.value, self.sample_metadata4_value)
        self.assertEqual(metadata5.value, self.sample_metadata5_value)

        with self.assertRaises(SampleMetadata.DoesNotExist):
            try:
                SampleMetadata.objects.get(name=self.sample_metadata2_name, biosample=sample2.biosample_not_pool)
            except SampleMetadata.DoesNotExist as e:
                raise e






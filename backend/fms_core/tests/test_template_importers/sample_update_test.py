from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import SampleUpdateImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, Individual, SampleKind

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_sample


class SampleUpdateTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleUpdateImporter()
        self.file = APP_DATA_ROOT / "Sample_update_vtest.xlsx"
        ContentType.objects.clear_cache()

        self.sample_name = 'SampleTestForUpdate'
        self.sample_new_volume = 90

        self.prefill_data()


    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container, errors, warnings) = create_container(barcode='CONTAINER4SAMPLEUPDATE', kind='Tube', name='Container4SampleUpdate')

        (individual, errors, warnings) = get_or_create_individual(name='Individual4SampleUpdate', sex=Individual.SEX_MALE, taxon='TaxonHere')

        create_sample(name=self.sample_name, volume=100, concentration=25, collection_site='TestCaseSite',
                      creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                      container=container, individual=individual, sample_kind=sample_kind)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # #Custom tests for each template
        sample = Sample.objects.get(name=self.sample_name)
        self.assertTrue(sample.volume, self.sample_new_volume)
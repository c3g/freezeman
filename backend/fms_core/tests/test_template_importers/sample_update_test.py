from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import SampleUpdateImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, Individual, SampleKind, ProcessMeasurement

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample


class SampleUpdateTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleUpdateImporter()
        self.file = APP_DATA_ROOT / "Sample_update_vtest.xlsx"
        ContentType.objects.clear_cache()

        self.sample_name = 'SampleTestForUpdate'
        self.sample_new_volume = 90
        self.sample_new_concentration = 20
        self.sample_new_depleted = False
        self.delta_volume = 10.0
        self.update_date = datetime.datetime(2021, 10, 21, 0, 0)

        self.prefill_data()


    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container, errors, warnings) = create_container(barcode='CONTAINER4SAMPLEUPDATE', kind='Tube', name='Container4SampleUpdate')

        (individual, errors, warnings) = get_or_create_individual(name='Individual4SampleUpdate', taxon='Homo sapiens')

        create_full_sample(name=self.sample_name, volume=100, concentration=25, collection_site='TestCaseSite',
                           creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                           container=container, individual=individual, sample_kind=sample_kind)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # #Custom tests for each template
        sample = Sample.objects.get(name=self.sample_name)
        self.assertEqual(sample.volume, self.sample_new_volume)
        self.assertEqual(sample.concentration, self.sample_new_concentration)
        self.assertEqual(sample.depleted, self.sample_new_depleted)

        self.assertTrue(ProcessMeasurement.objects.get(source_sample=sample,
                                            execution_date=self.update_date
                                            ))
        pm = ProcessMeasurement.objects.get(source_sample=sample,
                                            execution_date=self.update_date
                                            )
        self.assertEqual(pm.volume_used, self.delta_volume)

        self.assertEqual(pm.process.protocol.name, 'Update')




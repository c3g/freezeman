from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import ExtractionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, Individual, SampleKind, ProcessMeasurement

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_sample


class ExtractionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ExtractionImporter()
        self.file = APP_DATA_ROOT / "Extraction_vtest.xlsx"
        ContentType.objects.clear_cache()

        self.prefill_data()


    def prefill_data(self):
        sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name='BLOOD')

        for barcode in ['tube001', 'tube002', 'tube003', 'tube004']:
            (container, errors, warnings) = create_container(barcode=barcode, kind='Tube', name=barcode)

        # for sample_data in [{'name': 'sample1'}, {'name': 'sample2'}]:
        #     create_sample(name=sample_data['name'], volume=100, collection_site='site1',
        #                   creation_date=datetime.datetime(2020, 5, 21, 0, 0),
        #                   container=container, individual=individual, sample_kind=sample_kind_BLOOD)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # #Custom tests for each template
        pass

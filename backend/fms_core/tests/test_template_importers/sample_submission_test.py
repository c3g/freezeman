from django.test import TestCase
from django.contrib.contenttypes.models import ContentType

from fms_core.template_importer.importers import SampleSubmissionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, Individual


class SampleSubmissionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleSubmissionImporter()
        self.file = APP_DATA_ROOT / "Sample_submission_vtest.xlsx"
        ContentType.objects.clear_cache()

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        #Custom tests for each template
        sample_names = ['Sample_DNA1', 'Sample_RNA1', 'Sample_Blood1', 'Sample_Expectoration1',
                        'Sample_gargle1', 'Sample_plasma1', 'Sample_saliva1']
        individual_name = 'MrTest'

        self.assertTrue(Individual.objects.get(name=individual_name))

        individual = Individual.objects.get(name=individual_name)
        for sample_name in sample_names:
            self.assertTrue(Sample.objects.filter(name=sample_name, individual=individual).exists())



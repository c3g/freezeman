from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from fms_core.template_importer.importers import SampleSubmissionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

from fms_core.models import Sample, Individual, DerivedSample, DerivedBySample, Container


class SampleSubmissionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleSubmissionImporter()
        self.file = APP_DATA_ROOT / "Sample_submission_v3_5_0.xlsx"
        ContentType.objects.clear_cache()

        self.invalid_template_tests = ["Sample_submission_v3_5_0_bad_location.xlsx",
                                       "Sample_submission_v3_5_0_dna_no_conc.xlsx",]

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        #Custom tests for each template
        sample_names = ['Sample_DNA1', 'Sample_RNA1', 'Sample_Blood1', 'Sample_Expectoration1',
                        'Sample_gargle1', 'Sample_plasma1', 'Sample_saliva1']
        individual_name = 'MrTest'

        self.assertTrue(Individual.objects.get(name=individual_name))

        for sample_name in sample_names:
            self.assertTrue(Sample.objects.filter(name=sample_name).exists())

            sample = Sample.objects.get(name=sample_name)
            derived_sample_id = DerivedBySample.objects.filter(sample_id=sample.id).first().derived_sample_id
            biosample = DerivedSample.objects.get(id=derived_sample_id).biosample
            self.assertEqual(biosample.individual.name, individual_name)

    def test_invalid_sample_submission(self):
        for f in self.invalid_template_tests:
            print(f"Testing invalid sample submission template {f}", flush=True)

            s = transaction.savepoint()
            result = load_template(importer=self.importer, file=TEST_DATA_ROOT / f)
            self.assertEqual(result['valid'], False)
            transaction.savepoint_rollback(s)






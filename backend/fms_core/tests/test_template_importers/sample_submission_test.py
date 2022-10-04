from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from fms_core.template_importer.importers import SampleSubmissionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

from fms_core.models import Sample, Individual, DerivedSample, DerivedBySample, Container
from fms_core.services.project import create_project
from fms_core.services.index import get_or_create_index_set, create_index


class SampleSubmissionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleSubmissionImporter()
        self.file = APP_DATA_ROOT / "Sample_submission_v3_13_0.xlsx"
        ContentType.objects.clear_cache()

        self.project_name = "TEST_PROJECT"

        self.invalid_template_tests = ["Sample_submission_v3_13_0_bad_location.xlsx",
                                       "Sample_submission_v3_13_0_dna_no_conc.xlsx",
                                       "Sample_submission_v3_13_0_library_without_index.xlsx",]

        # Create indices
        (index_set, _, errors, warnings) = get_or_create_index_set(set_name="Agilent SureSelect XT V2 96")
        (index_1, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                   index_name="SSXTHSV2703-SSXTHSV2503")
        self.prefill_data()

    def prefill_data(self):
        create_project(name=self.project_name)

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        #Custom tests for each template
        sample_names = ['Sample_DNA1', 'Sample_RNA1', 'Sample_Blood1', 'Sample_Expectoration1',
                        'Sample_gargle1', 'Sample_plasma1', 'Sample_saliva1', 'Library_pcr_free']
        individual_name = 'MrTest'
        individual_alias = 'MonsieurTest'

        self.assertTrue(Individual.objects.get(name=individual_name))

        for sample_name in sample_names:
            self.assertTrue(Sample.objects.filter(name=sample_name).exists())

            sample = Sample.objects.get(name=sample_name)
            derived_sample_id = DerivedBySample.objects.filter(sample_id=sample.id).first().derived_sample_id
            biosample = DerivedSample.objects.get(id=derived_sample_id).biosample
            self.assertEqual(biosample.individual.name, individual_name)
            self.assertEqual(biosample.individual.alias, individual_alias)

        # Verify the library is created
        library_derived_sample = Sample.objects.get(name='Library_pcr_free').derived_sample_not_pool
        self.assertIsNotNone(library_derived_sample.library)

    def test_invalid_sample_submission(self):
        for f in self.invalid_template_tests:
            s = transaction.savepoint()
            result = load_template(importer=self.importer, file=TEST_DATA_ROOT / f)
            self.assertEqual(result['valid'], False)
            transaction.savepoint_rollback(s)






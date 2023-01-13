from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from fms_core.template_importer.importers import SampleSubmissionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

from fms_core.models import Sample, Individual, DerivedSample, DerivedBySample, Workflow
from fms_core.services.project import create_project
from fms_core.services.study import create_study
from fms_core.services.index import get_or_create_index_set, create_index, create_indices_3prime_by_sequence, create_indices_5prime_by_sequence


class SampleSubmissionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleSubmissionImporter()
        self.file = APP_DATA_ROOT / "Sample_submission_v4_0_0.xlsx"
        ContentType.objects.clear_cache()

        self.project_name = "TEST_PROJECT"
        self.workflow_name = "PCR-free Illumina"

        self.invalid_template_tests = ["Sample_submission_v4_0_0_bad_location.xlsx",
                                       "Sample_submission_v4_0_0_dna_no_conc.xlsx",
                                       "Sample_submission_v4_0_0_library_without_index.xlsx",]

        # Create indices
        (index_set, _, errors, warnings) = get_or_create_index_set(set_name="Agilent SureSelect XT V2 96")
        (index_1, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                   index_name="SSXTHSV2703-SSXTHSV2503")
        create_indices_3prime_by_sequence(index_1, ["ACGTTTAGAC"])
        create_indices_5prime_by_sequence(index_1, ["GCGCCCAGAC"])
        (index_2, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                   index_name="SSXTHSV2704-SSXTHSV2504")
        create_indices_3prime_by_sequence(index_2, ["ACGTCTATAC"])
        create_indices_5prime_by_sequence(index_2, ["GCGCCCAGAC"])
        (index_3, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                   index_name="SSXTHSV2705-SSXTHSV2505")
        create_indices_3prime_by_sequence(index_3, ["ACGTTTAGAC"])
        create_indices_5prime_by_sequence(index_3, ["GCGCCCAGAC"])

        self.prefill_data()

    def prefill_data(self):
        self.project, _, _ = create_project(name=self.project_name)
        self.workflow = Workflow.objects.get(name=self.workflow_name)
        create_study(project=self.project,
                     workflow=self.workflow,
                     start=1,
                     end=8)

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        #Custom tests for each template
        samples = [
            {'name': 'Sample_DNA1', 'alias': 'DNA1_Alias'},
            {'name': 'Sample_RNA1', 'alias': 'RNA1_Alias'},
            {'name': 'Sample_Blood1', 'alias': 'Blood1_Alias'},
            {'name': 'Sample_Expectoration1', 'alias': 'Expectoration1_Alias'},
            {'name': 'Sample_gargle1', 'alias': ''},
            {'name': 'Sample_plasma1', 'alias': ''},
            {'name': 'Sample_saliva1', 'alias': ''},
            {'name': 'Library_pcr_free', 'alias': ''}
        ]
        individual_name = 'MrTest'
        individual_alias = 'MonsieurTest'

        self.assertTrue(Individual.objects.get(name=individual_name))

        for sample in samples:
            self.assertTrue(Sample.objects.filter(name=sample['name']).exists())

            sample_obj = Sample.objects.get(name=sample['name'])
            derived_sample_id = DerivedBySample.objects.filter(sample_id=sample_obj.id).first().derived_sample_id
            biosample = DerivedSample.objects.get(id=derived_sample_id).biosample
            self.assertEqual(biosample.individual.name, individual_name)
            self.assertEqual(biosample.individual.alias, individual_alias)
            if sample['alias']:
                self.assertEqual(biosample.alias, sample['alias'])
            else:
                self.assertEqual(biosample.alias, sample['name'])

        # Tests for the submitted pool
        pool_name = 'SubmittedPool'
        pooled_libraries_alias = ['Library_for_pool_1', 'Library_for_pool_2']
        self.assertTrue(Sample.objects.filter(name=pool_name).exists())
        pool = Sample.objects.get(name=pool_name)
        derived_by_samples = DerivedBySample.objects.filter(sample_id=pool.id)
        self.assertEqual(derived_by_samples.count(), 2)

        for derived_by_sample in derived_by_samples:
            self.assertIsNotNone(derived_by_sample.derived_sample.library)
            self.assertIn(derived_by_sample.derived_sample.biosample.alias, pooled_libraries_alias)

        # Verify the library is created
        library_derived_sample = Sample.objects.get(name='Library_pcr_free').derived_sample_not_pool
        self.assertIsNotNone(library_derived_sample.library)
        self.assertEqual(library_derived_sample.library.library_selection.name, "Capture")
        self.assertEqual(library_derived_sample.library.library_selection.target, "Exome")

    def test_invalid_sample_submission(self):
        for f in self.invalid_template_tests:
            s = transaction.savepoint()
            result = load_template(importer=self.importer, file=TEST_DATA_ROOT / f)
            self.assertEqual(result['valid'], False)
            transaction.savepoint_rollback(s)

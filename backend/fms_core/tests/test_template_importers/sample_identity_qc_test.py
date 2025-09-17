from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import SampleIdentityQCImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, SampleKind, ProcessMeasurement, Taxon, Workflow, Project, Study

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.services.sample_next_step import queue_sample_to_study_workflow


class SampleIdentityQCTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleIdentityQCImporter()
        self.file = APP_DATA_ROOT / "Sample_identity_QC_v5_2_0.xlsx"
        ContentType.objects.clear_cache()

        self.QC_date = datetime.datetime(2025, 7, 29, 0, 0)
        self.initial_volume = 100
        self.volume_used = 2
        self.sample_concentration = 25

        self.project = Project.objects.create(name="Test_SNP_ARRAY")
        self.workflow_pcr_free_with_id_check = Workflow.objects.get(name="PCR-free Illumina with ID Check")
        self.letter_valid = "A"
        self.start = 3
        self.end = 3
        self.study = Study.objects.create(letter=self.letter_valid,
                                          project=self.project,
                                          workflow=self.workflow_pcr_free_with_id_check,
                                          start=self.start,
                                          end=self.end)

        self.prefill_data()

    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
        taxon = Taxon.objects.get(name='Homo sapiens')

        container, _, _ = create_container(barcode='PlatePasPleine1', kind='96-well plate', name='PlatePasPleine1')

        bob, _, _, _ = get_or_create_individual(name='Bob', taxon=taxon)
        bibi, _, _, _ = get_or_create_individual(name='Bibi', taxon=taxon)
        stephan, _, _, _ = get_or_create_individual(name='Stephan', taxon=taxon)

        self.sample_name_1 = "ImBob"
        self.sample_name_2 = "ImBibi"
        self.sample_name_3 = "ImStephan"

        bob_sample, _, _ = create_full_sample(name=self.sample_name_1,
                                              volume=self.initial_volume,
                                              concentration=self.sample_concentration,
                                              creation_date=datetime.datetime(2025, 7, 25, 0, 0),
                                              container=container,
                                              coordinates="A01",
                                              individual=bob,
                                              sample_kind=sample_kind)
        for derived_by_sample in bob_sample.derived_by_samples.all():
            derived_by_sample.project_id = self.project.id
            derived_by_sample.save()
        queue_sample_to_study_workflow(bob_sample, self.study)

        bibi_sample, _, _ = create_full_sample(name=self.sample_name_2,
                                               volume=self.initial_volume,
                                               concentration=self.sample_concentration,
                                               creation_date=datetime.datetime(2025, 7, 25, 0, 0),
                                               container=container,
                                               coordinates="A02",
                                               individual=bibi,
                                               sample_kind=sample_kind)
        for derived_by_sample in bibi_sample.derived_by_samples.all():
            derived_by_sample.project_id = self.project.id
            derived_by_sample.save()
        queue_sample_to_study_workflow(bibi_sample, self.study)

        stephan_sample, _, _ = create_full_sample(name=self.sample_name_3,
                                                  volume=self.initial_volume,
                                                  concentration=self.sample_concentration,
                                                  creation_date=datetime.datetime(2025, 7, 25, 0, 0),
                                                  container=container,
                                                  coordinates="H12",
                                                  individual=stephan,
                                                  sample_kind=sample_kind)
        for derived_by_sample in stephan_sample.derived_by_samples.all():
            derived_by_sample.project_id = self.project.id
            derived_by_sample.save()
        queue_sample_to_study_workflow(stephan_sample, self.study)

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Sample information tests
        bob_sample = Sample.objects.get(name=self.sample_name_1)
        self.assertEqual(bob_sample.volume, self.initial_volume - self.volume_used)
        self.assertEqual(bob_sample.concentration, self.sample_concentration)
        # Sample flag tests
        self.assertTrue(bob_sample.identity_flag)

        # Process measurement tests
        self.assertTrue(ProcessMeasurement.objects.get(source_sample=bob_sample, execution_date=self.QC_date))
        pm = ProcessMeasurement.objects.get(source_sample=bob_sample, execution_date=self.QC_date)
        self.assertEqual(pm.volume_used, self.volume_used)
        self.assertEqual(pm.process.protocol.name, 'Sample Identity Quality Control')

        bibi_sample = Sample.objects.get(name=self.sample_name_2)
        self.assertEqual(bibi_sample.volume, self.initial_volume - self.volume_used)
        self.assertEqual(bibi_sample.concentration, self.sample_concentration)
        # Sample flag tests
        self.assertFalse(bibi_sample.identity_flag)

        # Process measurement tests
        self.assertTrue(ProcessMeasurement.objects.get(source_sample=bibi_sample, execution_date=self.QC_date))
        pm = ProcessMeasurement.objects.get(source_sample=bibi_sample, execution_date=self.QC_date)
        self.assertEqual(pm.volume_used, self.volume_used)
        self.assertEqual(pm.process.protocol.name, 'Sample Identity Quality Control')

        stephan_sample = Sample.objects.get(name=self.sample_name_3)
        self.assertEqual(stephan_sample.volume, self.initial_volume - self.volume_used)
        self.assertEqual(stephan_sample.concentration, self.sample_concentration)
        # Sample flag tests
        self.assertFalse(stephan_sample.identity_flag)

        # Process measurement tests
        self.assertTrue(ProcessMeasurement.objects.get(source_sample=stephan_sample, execution_date=self.QC_date))
        pm = ProcessMeasurement.objects.get(source_sample=stephan_sample, execution_date=self.QC_date)
        self.assertEqual(pm.volume_used, self.volume_used)
        self.assertEqual(pm.process.protocol.name, 'Sample Identity Quality Control')

        
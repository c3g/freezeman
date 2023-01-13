from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (SampleNextStep, Sample, Study, Workflow, Step,
                             StepOrder, Individual, Container, SampleKind,
                             Project)
from fms_core.tests.constants import create_container, create_individual, create_fullsample, create_sample_container

class SampleNextStepTest(TestCase):
    def setUp(self):
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD", is_extracted=False, concentration_required=False)
        self.sample = create_fullsample(name="TestSampleWF",
                                        alias="sample1",
                                        volume=5000,
                                        individual=self.valid_individual,
                                        sample_kind=self.sample_kind_BLOOD,
                                        container=self.valid_container)
        self.workflow = Workflow.objects.get(name="PCR-free Illumina")
        self.step = Step.objects.get(name="Extraction (DNA)")
        self.step_order = StepOrder.objects.get(order=1, workflow=self.workflow, step=self.step)
        self.project = Project.objects.create(name="TestSampleNextStep")
        for derived_sample in self.sample.derived_samples.all():
            derived_sample.project_id = self.project.id
            derived_sample.save()
        self.letter_valid = "A"
        self.start = 1
        self.end = 7
        self.study = Study.objects.create(letter=self.letter_valid,
                                          project=self.project,
                                          workflow=self.workflow,
                                          start=self.start,
                                          end=self.end,
                                          reference_genome=None)

    def test_sample_next_step(self):
        sample_next_step = SampleNextStep.objects.create(step_order=self.step_order,
                                                         sample=self.sample,
                                                         study=self.study)
        self.assertEqual(sample_next_step.step_order, self.step_order)

    def test_no_step_order(self):
        sample_next_step = SampleNextStep.objects.create(step_order=None,
                                                         sample=self.sample,
                                                         study=self.study)
        self.assertIsNone(sample_next_step.step_order)

    def test_no_study(self):
        with self.assertRaises(Study.DoesNotExist):
            try:
                sample_next_step = SampleNextStep.objects.create(step_order=self.step_order,
                                                                 sample=self.sample,
                                                                 study=None)
            except Study.DoesNotExist as e:
                raise e

    def test_no_sample(self):
        with self.assertRaises(Sample.DoesNotExist):
            try:
                sample_next_step = SampleNextStep.objects.create(step_order=self.step_order,
                                                                 sample=None,
                                                                 study=self.study)
            except Sample.DoesNotExist as e:
                raise e
from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (SampleNextStep, SampleNextStepByStudy, Study, Workflow, Step,
                             StepOrder, Individual, Container, SampleKind,
                             Project)
from fms_core.tests.constants import create_container, create_individual, create_fullsample, create_sample_container

class SampleNextStepByStudyTest(TestCase):
    def setUp(self):
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        self.valid_container_1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
        self.valid_container_2 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube02', barcode='T1234567'))
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD", is_extracted=False, concentration_required=False)
        self.sample_kind_DNA, _ = SampleKind.objects.get_or_create(name="DNA", is_extracted=True, concentration_required=True)
        self.sample_BLOOD = create_fullsample(name="TestSampleWF",
                                              alias="sample1",
                                              volume=5000,
                                              individual=self.valid_individual,
                                              sample_kind=self.sample_kind_BLOOD,
                                              container=self.valid_container_1)
        self.sample_DNA = create_fullsample(name="TestSampleWF",
                                            alias="sample1",
                                            volume=5000,
                                            individual=self.valid_individual,
                                            sample_kind=self.sample_kind_DNA,
                                            container=self.valid_container_2)
        self.workflow = Workflow.objects.get(name="PCR-free Illumina")
        self.step_valid = Step.objects.get(name="Sample QC")
        self.step_before = Step.objects.get(name="Extraction (DNA)")
        self.step_after = Step.objects.get(name="Library Preparation (PCR-free, Illumina)")
        self.step_order = StepOrder.objects.get(order=2, workflow=self.workflow, step=self.step_valid)
        self.step_order_before = StepOrder.objects.get(order=1, workflow=self.workflow, step=self.step_before)
        self.step_order_after = StepOrder.objects.get(order=4, workflow=self.workflow, step=self.step_after)
        self.project = Project.objects.create(name="TestSampleNextStep")
        self.project_other = Project.objects.create(name="ProjectOther")
        for derived_sample in self.sample_BLOOD.derived_samples.all():
            derived_sample.project_id = self.project.id
            derived_sample.save()
        for derived_sample in self.sample_DNA.derived_samples.all():
            derived_sample.project_id = self.project.id
            derived_sample.save()
        self.letter_valid = "A"
        self.start = 2
        self.end = 3
        self.study = Study.objects.create(letter=self.letter_valid,
                                          project=self.project,
                                          workflow=self.workflow,
                                          start=self.start,
                                          end=self.end)

    def test_sample_next_step_by_study(self):
        sample_next_step = SampleNextStep.objects.create(step=self.step_valid,
                                                         sample=self.sample_DNA)                                                         
        self.assertEqual(sample_next_step.step, self.step_valid)
        sample_next_step_by_study = SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step,
                                                                         step_order=self.step_order,
                                                                         study=self.study)
        self.assertTrue(isinstance(sample_next_step_by_study, SampleNextStepByStudy))

    def test_no_sample_next_step(self):
        with self.assertRaises(SampleNextStep.DoesNotExist):
            try:
                sample_next_step_by_study = SampleNextStepByStudy.objects.create(sample_next_step=None,
                                                                                 step_order=self.step_order,
                                                                                 study=self.study)
            except SampleNextStep.DoesNotExist as e:
                raise e

    def test_no_study(self):
        sample_next_step = SampleNextStep.objects.create(step=self.step_valid,
                                                         sample=self.sample_DNA)                                                         
        self.assertEqual(sample_next_step.step, self.step_valid)
        with self.assertRaises(Study.DoesNotExist):
            try:
                sample_next_step_by_study = SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step,
                                                                                 step_order=self.step_order,
                                                                                 study=None)
            except Study.DoesNotExist as e:
                raise e

    def test_no_step_order(self):
        sample_next_step = SampleNextStep.objects.create(step=self.step_before,
                                                         sample=self.sample_BLOOD)                                                         
        self.assertEqual(sample_next_step.step, self.step_before)
        with self.assertRaises(StepOrder.DoesNotExist):
            try:
                sample_next_step_by_study = SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step,
                                                                                 step_order=None,
                                                                                 study=self.study)
            except StepOrder.DoesNotExist as e:
                raise e

    def test_step_order_before(self):
        sample_next_step = SampleNextStep.objects.create(step=self.step_before,
                                                         sample=self.sample_BLOOD)                                                         
        self.assertEqual(sample_next_step.step, self.step_before)
        with self.assertRaises(ValidationError):
            try:
                sample_next_step_by_study = SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step,
                                                                                 step_order=self.step_order_before,
                                                                                 study=self.study)
            except ValidationError as e:
                self.assertTrue('step_order' in e.message_dict)                                            
                raise e

    def test_step_order_after(self):
        sample_next_step = SampleNextStep.objects.create(step=self.step_after,
                                                         sample=self.sample_DNA)                                                         
        self.assertEqual(sample_next_step.step, self.step_after)
        with self.assertRaises(ValidationError):
            try:
                sample_next_step_by_study = SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step,
                                                                                 step_order=self.step_order_after,
                                                                                 study=self.study)
            except ValidationError as e:
                self.assertTrue('step_order' in e.message_dict)                                            
                raise e

    def test_wrong_step(self):
        sample_next_step = SampleNextStep.objects.create(step=self.step_before,
                                                         sample=self.sample_BLOOD)                                                         
        self.assertEqual(sample_next_step.step, self.step_before)
        with self.assertRaises(ValidationError):
            try:
                sample_next_step_by_study = SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step,
                                                                                 step_order=self.step_order,
                                                                                 study=self.study)
            except ValidationError as e:
                self.assertTrue('step' in e.message_dict)                                            
                raise e

    def test_wrong_project(self):
        for derived_sample in self.sample_DNA.derived_samples.all():
            derived_sample.project_id = self.project_other.id
            derived_sample.save()
        sample_next_step = SampleNextStep.objects.create(step=self.step_valid,
                                                         sample=self.sample_DNA)                                                         
        self.assertEqual(sample_next_step.step, self.step_valid)
        with self.assertRaises(ValidationError):
            try:
                sample_next_step_by_study = SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step,
                                                                                 step_order=self.step_order,
                                                                                 study=self.study)
            except ValidationError as e:
                self.assertTrue('project' in e.message_dict)                                            
                raise e
from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import SampleNextStep, Study, Workflow, Step, StepOrder, Individual, Container, SampleKind, Project
from fms_core.tests.constants import create_individual, create_fullsample, create_sample_container
from fms_core.services.sample_next_step import queue_sample_to_study_workflow, dequeue_sample_from_all_steps_study_workflow, dequeue_sample_from_specific_step_study_workflow, is_sample_queued_in_study, has_sample_completed_study

class SampleNextStepServicesTestCase(TestCase):
    def setUp(self):
            self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
            self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
            self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD", is_extracted=False, concentration_required=False)
            self.sample = create_fullsample(name="TestSampleNextStep",
                                            alias="sample1",
                                            volume=5000,
                                            individual=self.valid_individual,
                                            sample_kind=self.sample_kind_BLOOD,
                                            container=self.valid_container)
            self.workflow = Workflow.objects.get(name="PCR-free Illumina")
            self.step = Step.objects.get(name="Extraction (DNA)")
            self.step_order = StepOrder.objects.get(order=1, workflow=self.workflow, step=self.step)
            self.project = Project.objects.create(name="TestSampleNextStep")
            self.letter_valid = "A"
            self.start = 1
            self.end = 7
            self.study = Study.objects.create(letter=self.letter_valid,
                                              project=self.project,
                                              workflow=self.workflow,
                                              start=self.start,
                                              end=self.end,
                                              reference_genome=None)

    def test_queue_sample_to_study_workflow_default(self):
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.step_order.order, 1)
        self.assertEqual(sample_next_step.study, self.study)

    def test_queue_sample_to_valid_step(self):
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study, 3)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.step_order.order, 3)
        self.assertEqual(sample_next_step.sample, self.sample)

    def test_queue_sample_to_invalid_step(self):
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study, 8)
        self.assertEqual(errors, ["Order must be a positive integer between 1 and 7."])
        self.assertEqual(warnings, [])
        self.assertIsNone(sample_next_step)

    def test_dequeue_sample_from_valid_step(self):
        # Queue sample first
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.step_order.order, 1)
        self.assertEqual(sample_next_step.sample, self.sample)
        
        # Dequeue sample
        dequeued, errors, warnings = dequeue_sample_from_specific_step_study_workflow(self.sample, self.study, 1)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertTrue(dequeued)
        self.assertFalse(SampleNextStep.objects.filter(sample=self.sample, study=self.study).exists())
    
    def test_dequeue_sample_from_invalid_step(self):
        # Queue sample first and test it
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study, 2)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.step_order.order, 2)
        self.assertEqual(sample_next_step.sample, self.sample)

        dequeued, errors, warnings = dequeue_sample_from_specific_step_study_workflow(self.sample, self.study, 1)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertFalse(dequeued)

    def test_dequeue_sample_from_multiple_steps(self):
        # Queue sample first and test it
        sample_next_step_1, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study, 1)
        self.assertTrue(isinstance(sample_next_step_1, SampleNextStep))
        self.assertEqual(sample_next_step_1.step_order.order, 1)
        self.assertEqual(sample_next_step_1.sample, self.sample)
        
        sample_next_step_2, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study, 2)
        self.assertTrue(isinstance(sample_next_step_2, SampleNextStep))
        self.assertEqual(sample_next_step_2.step_order.order, 2)
        self.assertEqual(sample_next_step_2.sample, self.sample)
        
        num_dequeued, errors, warnings = dequeue_sample_from_all_steps_study_workflow(self.sample, self.study)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(num_dequeued, 2)
    
    def test_is_sample_queued_in_study(self):
        # Test valid queueing
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study, 3)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.step_order.order, 3)
        self.assertEqual(sample_next_step.sample, self.sample)

        is_queued, errors, warnings = is_sample_queued_in_study(self.sample, self.study, 3)
        self.assertTrue(is_queued)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_is_sample_queued_in_invalid_study(self):
        # Test invalid queueing
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study, 10)
        self.assertEqual(sample_next_step, None)

        is_queued, errors, warnings = is_sample_queued_in_study(self.sample, self.study)
        self.assertFalse(is_queued)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_has_sample_completed_workflow_in_study(self):
        # Test valid completetion
        sample_next_step = SampleNextStep.objects.create(sample=self.sample, study=self.study)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.step_order, None)
        self.assertEqual(sample_next_step.sample, self.sample)

        has_completed, errors, warnings = has_sample_completed_study(self.sample, self.study)
        self.assertTrue(has_completed)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
    
    def test_has_sample_not_completed_workflow_in_study(self):
        # Test valid completetion
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample, self.study, 7)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.step_order.order, 7)
        self.assertEqual(sample_next_step.sample, self.sample)

        has_completed, errors, warnings = has_sample_completed_study(self.sample, self.study)
        self.assertFalse(has_completed)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
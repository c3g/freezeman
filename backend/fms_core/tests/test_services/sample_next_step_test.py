import datetime

from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (SampleNextStep, SampleNextStepByStudy, Study, Workflow,
                             Individual, Container, SampleKind, Project, Protocol,
                             StepHistory, Step, StepOrder, Process, ProcessMeasurement)
from fms_core.tests.constants import create_individual, create_fullsample, create_sample_container
from fms_core.services.sample_next_step import (queue_sample_to_study_workflow,
                                                dequeue_sample_from_all_steps_study_workflow,
                                                dequeue_sample_from_specific_step_study_workflow,
                                                is_sample_queued_in_study,
                                                has_sample_completed_study,
                                                move_sample_to_next_step,
                                                dequeue_sample_from_all_study_workflows_matching_step,
                                                remove_sample_from_workflow,
                                                execute_workflow_action)
from fms_core._constants import WorkflowAction

class SampleNextStepServicesTestCase(TestCase):
    def setUp(self):
            self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
            self.valid_container_1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
            self.valid_container_2 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube02', barcode='T1234568'))
            self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD", is_extracted=False, concentration_required=False)
            self.sample_kind_DNA, _ = SampleKind.objects.get_or_create(name="DNA", is_extracted=True, concentration_required=True)
            self.sample_BLOOD = create_fullsample(name="TestSampleNextStep",
                                                  alias="sample1",
                                                  volume=5000,
                                                  individual=self.valid_individual,
                                                  sample_kind=self.sample_kind_BLOOD,
                                                  container=self.valid_container_1)
            self.sample_DNA = create_fullsample(name="TestSampleNextStep",
                                                alias="sample1",
                                                volume=5000,
                                                individual=self.valid_individual,
                                                sample_kind=self.sample_kind_DNA,
                                                container=self.valid_container_2)
            self.workflow_pcr_free = Workflow.objects.get(name="PCR-free Illumina")
            self.workflow_pcr_enriched = Workflow.objects.get(name="PCR-enriched Illumina")
            self.step = Step.objects.get(name="Extraction (DNA)")
            self.step_order = StepOrder.objects.get(order=1, workflow=self.workflow_pcr_free, step=self.step)
            self.project = Project.objects.create(name="TestSampleNextStep")

            for derived_sample in self.sample_BLOOD.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()

            for derived_sample in self.sample_DNA.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()
                
            self.letter_valid = "A"
            self.start = 1
            self.end = 3
            self.study = Study.objects.create(letter=self.letter_valid,
                                              project=self.project,
                                              workflow=self.workflow_pcr_free,
                                              start=self.start,
                                              end=self.end)

    def test_queue_sample_to_study_workflow_default(self):
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample_BLOOD, self.study)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        sample_next_step_by_study = SampleNextStepByStudy.objects.get(sample_next_step=sample_next_step, step_order__step=sample_next_step.step, study=self.study)
        self.assertTrue(isinstance(sample_next_step_by_study, SampleNextStepByStudy))
        self.assertEqual(sample_next_step_by_study.step_order.order, 1)

    def test_queue_sample_to_valid_step(self):
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample_DNA, self.study, 3)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        sample_next_step_by_study = SampleNextStepByStudy.objects.get(sample_next_step=sample_next_step, step_order__step=sample_next_step.step, study=self.study)
        self.assertEqual(sample_next_step_by_study.step_order.order, 3)
        self.assertEqual(sample_next_step.sample, self.sample_DNA)

    def test_queue_sample_to_invalid_step(self):
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample_DNA, self.study, 4)
        self.assertEqual(errors, ["Order must be a positive integer between 1 and 3."])
        self.assertEqual(warnings, [])
        self.assertIsNone(sample_next_step)

    def test_dequeue_sample_from_valid_step(self):
        # Queue sample first
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample_BLOOD, self.study)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        sample_next_step_by_study = SampleNextStepByStudy.objects.get(sample_next_step=sample_next_step, step_order__step=sample_next_step.step, study=self.study)
        self.assertTrue(isinstance(sample_next_step_by_study, SampleNextStepByStudy))
        self.assertEqual(sample_next_step_by_study.step_order.order, 1)
        self.assertEqual(sample_next_step.sample, self.sample_BLOOD)
        
        # Dequeue sample
        dequeued, errors, warnings = dequeue_sample_from_specific_step_study_workflow(self.sample_BLOOD, self.study, 1)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertTrue(dequeued)
        self.assertFalse(SampleNextStep.objects.filter(sample=self.sample_BLOOD, studies=self.study).exists())
    
    def test_dequeue_sample_from_invalid_step(self):
        # Queue sample first and test it
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample_BLOOD, self.study)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        sample_next_step_by_study = SampleNextStepByStudy.objects.get(sample_next_step=sample_next_step, step_order__step=sample_next_step.step, study=self.study)
        self.assertTrue(isinstance(sample_next_step_by_study, SampleNextStepByStudy))
        self.assertEqual(sample_next_step_by_study.step_order.order, 1)
        self.assertEqual(sample_next_step.sample, self.sample_BLOOD)

        dequeued, errors, warnings = dequeue_sample_from_specific_step_study_workflow(self.sample_BLOOD, self.study, 2)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertFalse(dequeued)

    def test_dequeue_sample_from_multiple_steps(self):
        # Queue sample first and test it
        sample_next_step_1, errors, warnings = queue_sample_to_study_workflow(self.sample_DNA, self.study, 2)
        self.assertTrue(isinstance(sample_next_step_1, SampleNextStep))
        sample_next_step_by_study_1 = SampleNextStepByStudy.objects.get(sample_next_step=sample_next_step_1, step_order__step=sample_next_step_1.step, study=self.study)
        self.assertTrue(isinstance(sample_next_step_by_study_1, SampleNextStepByStudy))
        self.assertEqual(sample_next_step_by_study_1.step_order.order, 2)
        self.assertEqual(sample_next_step_1.sample, self.sample_DNA)
        
        sample_next_step_2, errors, warnings = queue_sample_to_study_workflow(self.sample_DNA, self.study, 3)
        self.assertTrue(isinstance(sample_next_step_2, SampleNextStep))
        sample_next_step_by_study_2 = SampleNextStepByStudy.objects.get(sample_next_step=sample_next_step_2, step_order__step=sample_next_step_2.step, study=self.study)
        self.assertTrue(isinstance(sample_next_step_by_study_2, SampleNextStepByStudy))
        self.assertEqual(sample_next_step_by_study_2.step_order.order, 3)
        self.assertEqual(sample_next_step_2.sample, self.sample_DNA)
        
        num_dequeued, errors, warnings = dequeue_sample_from_all_steps_study_workflow(self.sample_DNA, self.study)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(num_dequeued, 2)
    
    def test_is_sample_queued_in_study(self):
        # Test valid queueing
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample_DNA, self.study, 3)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        sample_next_step_by_study = SampleNextStepByStudy.objects.get(sample_next_step=sample_next_step, step_order__step=sample_next_step.step, study=self.study)
        self.assertTrue(isinstance(sample_next_step_by_study, SampleNextStepByStudy))
        self.assertEqual(sample_next_step_by_study.step_order.order, 3)
        self.assertEqual(sample_next_step.sample, self.sample_DNA)

        is_queued, errors, warnings = is_sample_queued_in_study(self.sample_DNA, self.study, 3)
        self.assertTrue(is_queued)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_is_sample_queued_in_invalid_study(self):
        # Test invalid queueing
        sample_next_step, errors, warnings = queue_sample_to_study_workflow(self.sample_DNA, self.study, 10)
        self.assertEqual(sample_next_step, None)

        is_queued, errors, warnings = is_sample_queued_in_study(self.sample_DNA, self.study)
        self.assertFalse(is_queued)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_has_sample_completed_workflow_in_study(self):
        # Test valid completion
        container1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01_1', barcode='T123456_1'))
        sample_in = create_fullsample(name="TestSampleNextStep_in",
                                      alias="TestSampleNextStep_in",
                                      volume=5000,
                                      individual=self.valid_individual,
                                      sample_kind=self.sample_kind_DNA,
                                      container=container1)
        for derived_sample in sample_in.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()

        step = Step.objects.get(name="Sample QC")
        sample_next_step = SampleNextStep.objects.create(sample=sample_in, step=step)
        step_order = StepOrder.objects.get(order=2, workflow=self.workflow_pcr_free, step=step)
        study = Study.objects.create(letter="B",
                                     project=self.project,
                                     workflow=self.workflow_pcr_free,
                                     start=2,
                                     end=2)
        SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step, step_order=step_order, study=study)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.sample, sample_in)

        protocol = Protocol.objects.get(name="Sample Quality Control")
        process = Process.objects.create(protocol=protocol)
        process_measurement = ProcessMeasurement.objects.create(process=process,
                                                                source_sample=sample_in,
                                                                execution_date=datetime.date(2021, 1, 10),
                                                                volume_used=10)
        move_sample_to_next_step(step, sample_in, process_measurement, WorkflowAction.NEXT_STEP)

        has_completed, errors, warnings = has_sample_completed_study(sample_in, study)
        self.assertTrue(has_completed)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
    
    def test_has_sample_not_completed_workflow_in_study(self):
        # Test valid completion
        container1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01_1', barcode='T123456_1'))
        sample_in = create_fullsample(name="TestSampleNextStep_in",
                                      alias="TestSampleNextStep_in",
                                      volume=5000,
                                      individual=self.valid_individual,
                                      sample_kind=self.sample_kind_DNA,
                                      container=container1)
        for derived_sample in sample_in.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()

        step = Step.objects.get(name="Sample QC")
        sample_next_step = SampleNextStep.objects.create(sample=sample_in, step=step)
        step_order = StepOrder.objects.get(order=2, workflow=self.workflow_pcr_free, step=step)
        study = Study.objects.create(letter="B",
                                     project=self.project,
                                     workflow=self.workflow_pcr_free,
                                     start=2,
                                     end=3)
        SampleNextStepByStudy.objects.create(sample_next_step=sample_next_step, step_order=step_order, study=study)
        self.assertTrue(isinstance(sample_next_step, SampleNextStep))
        self.assertEqual(sample_next_step.sample, sample_in)

        protocol = Protocol.objects.get(name="Sample Quality Control")
        process = Process.objects.create(protocol=protocol)
        process_measurement = ProcessMeasurement.objects.create(process=process,
                                                                source_sample=sample_in,
                                                                execution_date=datetime.date(2021, 1, 10),
                                                                volume_used=10)
        move_sample_to_next_step(step, sample_in, process_measurement, WorkflowAction.NEXT_STEP)

        has_completed, errors, warnings = has_sample_completed_study(sample_in, study)
        self.assertFalse(has_completed)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_move_sample_to_next_step(self):
        container1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01_1', barcode='T123456_1'))
        sample_in = create_fullsample(name="TestSampleNextStep_in",
                                      alias="TestSampleNextStep_in",
                                      volume=5000,
                                      individual=self.valid_individual,
                                      sample_kind=self.sample_kind_DNA,
                                      container=container1)
        
        step = Step.objects.get(name="Normalization (Sample)")
        for derived_sample in sample_in.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()
                
        letter_B = "B"
        start = 3
        end = 7
        study_B = Study.objects.create(letter=letter_B,
                                       project=self.project,
                                       workflow=self.workflow_pcr_free,
                                       start=start,
                                       end=end)

        letter_C = "C"
        start = 3
        end = 7
        study_C = Study.objects.create(letter=letter_C,
                                       project=self.project,
                                       workflow=self.workflow_pcr_enriched,
                                       start=start,
                                       end=end)

        protocol = Protocol.objects.get(name="Normalization")
        process = Process.objects.create(protocol=protocol)
        process_measurement = ProcessMeasurement.objects.create(process=process,
                                                                source_sample=sample_in,
                                                                execution_date=datetime.date(2021, 1, 10),
                                                                volume_used=10)

        old_sample_to_study_workflow_1, _, _ = queue_sample_to_study_workflow(sample_in, study_B)
        old_sample_to_study_workflow_2, _, _ = queue_sample_to_study_workflow(sample_in, study_C)
        new_sample_next_steps, errors, warnings = move_sample_to_next_step(step, sample_in, process_measurement, WorkflowAction.NEXT_STEP)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertIsNotNone(new_sample_next_steps)
        self.assertEqual(new_sample_next_steps[0].step.name, "Library Preparation (PCR-free, Illumina)")
        self.assertEqual(new_sample_next_steps[0].sample, sample_in)
        self.assertFalse(SampleNextStep.objects.filter(id=old_sample_to_study_workflow_1.id).exists())
        self.assertEqual(new_sample_next_steps[1].step.name, "Library Preparation (PCR-enriched, Illumina)")
        self.assertEqual(new_sample_next_steps[1].sample, sample_in)
        self.assertFalse(SampleNextStep.objects.filter(id=old_sample_to_study_workflow_2.id).exists())
        self.assertEqual(StepHistory.objects.filter(study=study_B, process_measurement__source_sample=sample_in, step_order__step=step).count(), 1)
        self.assertEqual(StepHistory.objects.filter(study=study_C, process_measurement__source_sample=sample_in, step_order__step=step).count(), 1)


    def test_move_sample_to_next_step_not_queued(self):
        container1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01_1', barcode='T123456_1'))
        sample_in = create_fullsample(name="TestSampleNextStep_in",
                                      alias="TestSampleNextStep_in",
                                      volume=5000,
                                      individual=self.valid_individual,
                                      sample_kind=self.sample_kind_DNA,
                                      container=container1)
        
        step = Step.objects.get(name="Library Preparation (WGBS, Illumina)")
        for derived_sample in sample_in.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()
                
        letter_B = "B"
        start = 4
        end = 7
        study_B = Study.objects.create(letter=letter_B,
                                       project=self.project,
                                       workflow=self.workflow_pcr_free,
                                       start=start,
                                       end=end)
        protocol = Protocol.objects.get(name="Library Preparation")
        process = Process.objects.create(protocol=protocol)
        process_measurement = ProcessMeasurement.objects.create(process=process,
                                                                source_sample=sample_in,
                                                                execution_date=datetime.date(2021, 1, 10),
                                                                volume_used=10)

        old_sample_to_study_workflow, _, _ = queue_sample_to_study_workflow(sample_in, study_B)
        new_sample_next_steps, errors, warnings = move_sample_to_next_step(step, sample_in, process_measurement)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertIsNotNone(new_sample_next_steps)
        self.assertEqual(new_sample_next_steps, [])
        self.assertTrue(SampleNextStep.objects.filter(id=old_sample_to_study_workflow.id).exists())

    def test_dequeue_sample_from_all_study_workflows_matching_step(self):
        letter_B = "B"
        start = 1
        end = 7
        second_study = Study.objects.create(letter=letter_B,
                                            project=self.project,
                                            workflow=self.workflow_pcr_enriched,
                                            start=start,
                                            end=end)
        # Basic case
        sample_next_step_1, errors, warnings = queue_sample_to_study_workflow(self.sample_BLOOD, self.study)
        count, errors, warnings = dequeue_sample_from_all_study_workflows_matching_step(self.sample_BLOOD, sample_next_step_1.step)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(count, 1)
        self.assertFalse(SampleNextStep.objects.filter(id=sample_next_step_1.id).exists())
        # More than one (include warning)
        sample_next_step_1, errors, warnings = queue_sample_to_study_workflow(self.sample_BLOOD, self.study)
        sample_next_step_2, errors, warnings = queue_sample_to_study_workflow(self.sample_BLOOD, second_study)
        count, errors, warnings = dequeue_sample_from_all_study_workflows_matching_step(self.sample_BLOOD, sample_next_step_1.step)
        self.assertEqual(errors, [])
        self.assertTrue("You are about to remove it from all study workflows." in warnings[0])
        self.assertEqual(count, 2)
        self.assertFalse(SampleNextStep.objects.filter(id=sample_next_step_1.id).exists())
        self.assertFalse(SampleNextStep.objects.filter(id=sample_next_step_2.id).exists())
        count, errors, warnings = dequeue_sample_from_all_study_workflows_matching_step(self.sample_BLOOD, sample_next_step_1.step)
        self.assertEqual(errors, [])
        self.assertTrue("does not appear to to be queued" in warnings[0])
        self.assertEqual(count, 0)

    def test_remove_sample_from_workflow(self):
        container1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01_1', barcode='T123456_1'))
        sample_in = create_fullsample(name="TestSampleRemoved_in",
                                      alias="TestSampleRemoved_in",
                                      volume=5000,
                                      individual=self.valid_individual,
                                      sample_kind=self.sample_kind_DNA,
                                      container=container1)
        
        step = Step.objects.get(name="Normalization (Sample)")
        for derived_sample in sample_in.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()
                
        letter_B = "B"
        start = 3
        end = 7
        study_B = Study.objects.create(letter=letter_B,
                                       project=self.project,
                                       workflow=self.workflow_pcr_free,
                                       start=start,
                                       end=end)

        letter_C = "C"
        start = 3
        end = 7
        study_C = Study.objects.create(letter=letter_C,
                                       project=self.project,
                                       workflow=self.workflow_pcr_enriched,
                                       start=start,
                                       end=end)

        letter_D = "D"
        start = 4
        end = 7
        study_D = Study.objects.create(letter=letter_D,
                                       project=self.project,
                                       workflow=self.workflow_pcr_enriched,
                                       start=start,
                                       end=end)

        protocol = Protocol.objects.get(name="Normalization")
        process = Process.objects.create(protocol=protocol)
        process_measurement = ProcessMeasurement.objects.create(process=process,
                                                                source_sample=sample_in,
                                                                execution_date=datetime.date(2021, 1, 10),
                                                                volume_used=10)

        _, _, _ = queue_sample_to_study_workflow(sample_in, study_B)
        _, _, _ = queue_sample_to_study_workflow(sample_in, study_C)
        _, _, _ = queue_sample_to_study_workflow(sample_in, study_D)
        count_removed, errors, warnings = remove_sample_from_workflow(step, sample_in, process_measurement, WorkflowAction.DEQUEUE_SAMPLE)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, ['Sample TestSampleRemoved_in is queued to step Normalization (Sample) for 2 studies. You are about to remove it from all study workflows.'])
        self.assertEqual(count_removed, 2)
        self.assertEqual(SampleNextStep.objects.filter(sample=sample_in).count(), 1)
        self.assertEqual(StepHistory.objects.filter(study=study_B,
                                                    process_measurement__source_sample=sample_in,
                                                    step_order__step=step,
                                                    workflow_action=WorkflowAction.DEQUEUE_SAMPLE).count(), 1)
        self.assertEqual(StepHistory.objects.filter(study=study_C,
                                                    process_measurement__source_sample=sample_in,
                                                    step_order__step=step,
                                                    workflow_action=WorkflowAction.DEQUEUE_SAMPLE).count(), 1)

    def test_execute_workflow_action(self):
        container1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01_1', barcode='T123456_1'))
        container2 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01_2', barcode='T123456_2'))
        sample_in = create_fullsample(name="TestSampleNextStep_in",
                                      alias="TestSampleNextStep_in",
                                      volume=5000,
                                      individual=self.valid_individual,
                                      sample_kind=self.sample_kind_BLOOD,
                                      container=container1)

        sample_out = create_fullsample(name="TestSampleNextStep_out",
                                      alias="TestSampleNextStep_out",
                                      volume=1000,
                                      concentration=10,
                                      individual=self.valid_individual,
                                      sample_kind=self.sample_kind_DNA,
                                      container=container2)
        
        step_1 = Step.objects.get(name="Extraction (DNA)")
        for derived_sample in sample_in.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()

        for derived_sample in sample_out.derived_samples.all():
                derived_sample.project_id = self.project.id
                derived_sample.save()
                
        letter_B = "B"
        start = 1
        end = 7
        study_B = Study.objects.create(letter=letter_B,
                                       project=self.project,
                                       workflow=self.workflow_pcr_free,
                                       start=start,
                                       end=end)

        protocol_1 = Protocol.objects.get(name="Extraction")
        process_1 = Process.objects.create(protocol=protocol_1)
        process_measurement_1 = ProcessMeasurement.objects.create(process=process_1,
                                                                  source_sample=sample_in,
                                                                  execution_date=datetime.date(2021, 1, 10),
                                                                  volume_used=5000)

        old_sample_to_study_workflow_1, _, _ = queue_sample_to_study_workflow(sample_in, study_B)
        errors, warnings = execute_workflow_action(workflow_action=WorkflowAction.NEXT_STEP.label,
                                                   step=step_1,
                                                   current_sample=sample_in,
                                                   process_measurement=process_measurement_1,
                                                   next_sample=sample_out)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(StepHistory.objects.filter(study=study_B,
                                                    process_measurement__source_sample=sample_in,
                                                    step_order__step=step_1,
                                                    workflow_action=WorkflowAction.NEXT_STEP).count(), 1)

        step_2 = Step.objects.get(name="Sample QC")
        protocol_2 = Protocol.objects.get(name="Sample Quality Control")
        process_2 = Process.objects.create(protocol=protocol_2)
        process_measurement_2 = ProcessMeasurement.objects.create(process=process_2,
                                                                  source_sample=sample_out,
                                                                  execution_date=datetime.date(2021, 1, 10),
                                                                  volume_used=2)
        errors, warnings = execute_workflow_action(workflow_action=WorkflowAction.DEQUEUE_SAMPLE.label,
                                                   step=step_2,
                                                   current_sample=sample_out,
                                                   process_measurement=process_measurement_2)
        
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(StepHistory.objects.filter(study=study_B,
                                                    process_measurement__source_sample=sample_out,
                                                    step_order__step=step_2,
                                                    workflow_action=WorkflowAction.DEQUEUE_SAMPLE).count(), 1)

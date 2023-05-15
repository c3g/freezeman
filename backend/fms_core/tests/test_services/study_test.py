from django.test import TestCase

from fms_core.services.study import get_study, create_study, can_remove_study
from fms_core.models import Workflow, Project, Study

# imports for setup_samplenextsetup
from fms_core.models import Individual, Container, SampleKind, Step, StepOrder
from fms_core.tests.constants import create_individual, create_fullsample, create_sample_container
from fms_core.services.sample_next_step import queue_sample_to_study_workflow, dequeue_sample_from_specific_step_study_workflow

# imports for setup_stephistory
from fms_core.models import Protocol, Sample, Process, ProcessMeasurement, StepHistory
from fms_core.tests.constants import create_sample
import datetime

class StudyServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.workflow = Workflow.objects.get(name="PCR-free Illumina")
        self.project = Project.objects.create(name="TestStudy")
        self.letter_valid = "A"
        self.next_valid_letter = "B"
        self.start = 1
        self.end = 7
        self.study = Study.objects.create(letter=self.letter_valid,
                                          project=self.project,
                                          workflow=self.workflow,
                                          start=self.start,
                                          end=self.end)
    def setup_samplenextsetup(self):
        valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        valid_container_1 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
        sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD", is_extracted=False, concentration_required=False)
        self.sample_BLOOD = create_fullsample(name="TestSampleWF",
                                         alias="sample1",
                                         volume=5000,
                                         individual=valid_individual,
                                         sample_kind=sample_kind_BLOOD,
                                         container=valid_container_1)
        workflow = Workflow.objects.get(name="PCR-free Illumina")
        step_valid = Step.objects.get(name="Sample QC")
        step_before = Step.objects.get(name="Extraction (DNA)")
        step_after = Step.objects.get(name="Library Preparation (PCR-free, Illumina)")
        step_order = StepOrder.objects.get(order=2, workflow=workflow, step=step_valid)
        self.step_order_before = StepOrder.objects.get(order=1, workflow=workflow, step=step_before)
        step_order_after = StepOrder.objects.get(order=4, workflow=workflow, step=step_after)
        for derived_sample in self.sample_BLOOD.derived_samples.all():
            derived_sample.project_id = self.project.id
            derived_sample.save()
    
    def setup_stephistory(self):
        update_protocol, _ = Protocol.objects.get_or_create(name="Update")
        process = Process.objects.create(protocol=update_protocol, comment="Process for Protocol Update Test")
        self.process_measurement = ProcessMeasurement.objects.create(process=process,
                                                                     source_sample=self.sample_BLOOD,
                                                                     volume_used=None,
                                                                     comment="Test comment",
                                                                     execution_date=datetime.datetime.today())

    def test_get_study(self):
        """
          Test to retrieve the study A of project TestStudy
        """
        study, errors, warnings = get_study(self.project, self.letter_valid)

        self.assertEqual(study.letter, self.letter_valid)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
      
    def test_create_study(self):
        """
          Test to create the study B (generated automatically since there's already study A) of project TestStudy
        """
        study, errors, warnings = create_study(self.project, self.workflow, self.start, self.end)

        self.assertEqual(study.letter, self.next_valid_letter)
        self.assertEqual(study.project, self.project)
        self.assertEqual(errors, {})
        self.assertEqual(warnings, {})

    def test_create_invalid_study(self):
        """
          Test to create an invalid (without workflow and start) study B of project TestStudy 
        """
        study, errors, warnings = create_study(self.project, None, None, self.end)

        self.assertEqual(study, None)
        self.assertEqual(errors['workflow'], 'Missing workflow.')
        self.assertEqual(errors['start'], 'Missing start.')
        self.assertEqual(warnings, {})

    def test_create_invalid_end_study(self):
        """
          Test to create an invalid (end > num_steps) study B of project TestStudy 
        """
        study, errors, warnings = create_study(self.project, self.workflow, self.start, 10)
        self.assertEqual(study, None)
        self.assertEqual(errors['step_range'], ['The end step cannot be after the last step of the workflow.'])
        self.assertEqual(warnings, {})
    
    def test_can_remove_study(self):
        study, errors, warnings = get_study(self.project, self.letter_valid)
        
        # no dependencies
        is_removable, errors, warnings = can_remove_study(study.pk)
        self.assertEqual(True, is_removable)
        self.assertDictEqual(dict(), errors)
        self.assertDictEqual(dict(), warnings)

        # SampleNextStep and SampleNextStepByStudy
        self.setup_samplenextsetup()
        queue_sample_to_study_workflow(self.sample_BLOOD, self.study)
        is_removable, errors, warnings = can_remove_study(study.pk)
        self.assertEqual(False, is_removable)
        self.assertIn('SampleNextStep', errors)
        self.assertIn('SampleNextStepByStudy', errors)
        dequeue_sample_from_specific_step_study_workflow(self.sample_BLOOD, self.study, 1)
        
        # no dependencies
        is_removable, errors, warnings = can_remove_study(study.pk)
        self.assertEqual(True, is_removable)
        self.assertDictEqual(dict(), errors)
        self.assertDictEqual(dict(), warnings)

        # StepHistory
        self.setup_stephistory()
        StepHistory.objects.create(study=self.study,
            step_order=self.step_order_before,
            process_measurement=self.process_measurement)
        is_removable, errors, warnings = can_remove_study(study.pk)
        self.assertEqual(False, is_removable)
        self.assertIn('StepHistory', errors)
        self.assertNotIn('SampleNextStep', errors)
        self.assertNotIn('SampleNextStepByStudy', errors)

    def test_new_letter(self):
        studyA, *_ = get_study(self.project, self.letter_valid)
        studyB, *_ = create_study(self.project, self.workflow, self.start, self.end)

        # replace first study
        studyA.delete()
        newStudyA, *_ = create_study(self.project, self.workflow, self.start, self.end)
        self.assertEqual(studyA.letter, newStudyA.letter)

        # add study at the end
        studyC, *_ = create_study(self.project, self.workflow, self.start, self.end)
        self.assertEqual('C', studyC.letter)

        # replace middle study
        studyB.delete()
        newStudyB, *_ = create_study(self.project, self.workflow, self.start, self.end)
        self.assertEqual(studyB.letter, newStudyB.letter)

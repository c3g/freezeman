from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Study, Workflow, Project, StepOrder, Step, Protocol


class StudyTest(TestCase):
    def setUp(self):
        self.letter_valid = "A"
        self.letter_invalid = "b"
        self.project, _ = Project.objects.get_or_create(name="TestStudy")
        self.project_other, _ = Project.objects.get_or_create(name="TestStudyMore")
        self.start = 1
        self.end = 2
        # build mini test workflow
        protocol1 = Protocol.objects.get(name="Extraction")
        protocol2 = Protocol.objects.get(name="Sample Quality Control")
        step1 = Step.objects.create(name="Extraction DNA (test)", protocol=protocol1)
        step2 = Step.objects.create(name="Sample QC (test)", protocol=protocol2)
        self.workflow, _ = Workflow.objects.get_or_create(name="TestWorkflow", structure="Test")
        steporder2 = StepOrder.objects.create(step=step2, next_step_order=None, workflow=self.workflow, order=2)
        steporder1 = StepOrder.objects.create(step=step1, next_step_order=steporder2, workflow=self.workflow, order=1)

    def test_study(self):
        study = Study.objects.create(letter=self.letter_valid,
                                     project=self.project,
                                     workflow=self.workflow,
                                     start=self.start,
                                     end=self.end)
        self.assertEqual(study.letter, self.letter_valid)
        self.assertEqual(study.project, self.project)

    def test_invalid_letter(self):
        with self.assertRaises(ValidationError):
            try:
                Study.objects.create(letter=self.letter_invalid,
                                     project=self.project,
                                     workflow=self.workflow,
                                     start=self.start,
                                     end=self.end)
            except ValidationError as e:
                self.assertTrue("letter" in e.message_dict)
                raise e

    def test_no_project(self):
        with self.assertRaises(ValidationError):
            try:
                Study.objects.create(letter=self.letter_valid,
                                     project=None,
                                     workflow=self.workflow,
                                     start=self.start,
                                     end=self.end)
            except ValidationError as e:
                self.assertTrue("project" in e.message_dict)
                raise e

    def test_no_workflow(self):
        with self.assertRaises(Workflow.DoesNotExist):
            try:
                Study.objects.create(letter=self.letter_valid,
                                     project=self.project,
                                     workflow=None,
                                     start=self.start,
                                     end=self.end)
            except Workflow.DoesNotExist as e:
                raise e
    
    def test_start_greater_than_end(self):
        with self.assertRaises(ValidationError):
            try:
                Study.objects.create(letter=self.letter_valid,
                                     project=self.project,
                                     workflow=self.workflow,
                                     start=self.end,
                                     end=self.start)
            except ValidationError as e:
                self.assertTrue("step_range" in e.message_dict)
                raise e

    def test_end_outside_range(self):
        with self.assertRaises(ValidationError):
            try:
                Study.objects.create(letter=self.letter_valid,
                                     project=self.project,
                                     workflow=self.workflow,
                                     start=self.start,
                                     end=5)
            except ValidationError as e:
                self.assertTrue("step_range" in e.message_dict)
                raise e  


    def test_duplicate_study(self):
        # First study is correct
        Study.objects.create(letter=self.letter_valid,
                             project=self.project,
                             workflow=self.workflow,
                             start=self.start,
                             end=self.end)
        # second study with same letter and different project is correct
        Study.objects.create(letter=self.letter_valid,
                             project=self.project_other,
                             workflow=self.workflow,
                             start=self.start,
                             end=self.end)                            
        with self.assertRaises(ValidationError):
            try:
                # third study with the same letter and same project is in error
                Study.objects.create(letter=self.letter_valid,
                                     project=self.project,
                                     workflow=self.workflow,
                                     start=self.start,
                                     end=self.end)
            except ValidationError as e:
                self.assertTrue('__all__' in e.message_dict)
                raise e

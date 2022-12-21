from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Study, Workflow, Project, ReferenceGenome


class StudyTest(TestCase):
    def setUp(self):
        self.letter_valid = "A"
        self.letter_invalid = "b"
        self.project, _ = Project.objects.get_or_create(name="TestStudy")
        self.project_other, _ = Project.objects.get_or_create(name="TestStudyMore")
        self.workflow, _ = Workflow.objects.get_or_create(name="TestWorkflow", structure="Test")
        self.start = 1
        self.end = 5
        self.reference_genome = ReferenceGenome.objects.get(assembly_name="GRCh38.p14")

    def test_study(self):
        study = Study.objects.create(letter=self.letter_valid,
                                     project=self.project,
                                     workflow=self.workflow,
                                     start=self.start,
                                     end=self.end,
                                     reference_genome=self.reference_genome)
        self.assertEqual(study.letter, self.letter_valid)
        self.assertEqual(study.project, self.project)

    def test_no_project(self):
        with self.assertRaises(ValidationError):
            try:
                Study.objects.create(letter=self.letter_valid,
                                     project=None,
                                     workflow=self.workflow,
                                     start=self.start,
                                     end=self.end,
                                     reference_genome=self.reference_genome)
            except ValidationError as e:
                self.assertTrue("project" in e.message_dict)
                raise e

    def test_no_workflow(self):
        with self.assertRaises(ValidationError):
            try:
                Study.objects.create(letter=self.letter_valid,
                                     project=self.project,
                                     workflow=None,
                                     start=self.start,
                                     end=self.end,
                                     reference_genome=self.reference_genome)
            except ValidationError as e:
                self.assertTrue("workflow" in e.message_dict)
                raise e
    
    def test_no_reference_genome(self):
        study = Study.objects.create(letter=self.letter_valid,
                                     project=self.project,
                                     workflow=self.workflow,
                                     start=self.start,
                                     end=self.end,
                                     reference_genome=None)
        self.assertEqual(study.letter, self.letter_valid)
        self.assertEqual(study.project, self.project)
        self.assertIsNone(study.reference_genome)

    def test_duplicate_study(self):
        # First study is correct
        Study.objects.create(letter=self.letter_valid,
                             project=self.project,
                             workflow=self.workflow,
                             start=self.start,
                             end=self.end,
                             reference_genome=self.reference_genome)
        # First study is correct
        Study.objects.create(letter=self.letter_valid,
                             project=self.project_other,
                             workflow=self.workflow,
                             start=self.start,
                             end=self.end,
                             reference_genome=self.reference_genome)                            
        with self.assertRaises(ValidationError):
            try:
                # Second study with the same letter and different project
                Step.objects.create(name=self.name_new, protocol=self.protocol)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

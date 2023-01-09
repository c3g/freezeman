from django.test import TestCase

from fms_core.services.study import get_study, create_study
from fms_core.models import Workflow, Project, Study

class PlatformServicesTestCase(TestCase):
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
                                          end=self.end,
                                          reference_genome=None)

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
        study, errors, warnings = create_study(self.project, self.workflow, self.start, 9)
        self.assertEqual(study, None)
        self.assertEqual(errors['step_range'], ['The end step cannot be after the last step of the workflow.'])
        self.assertEqual(warnings, {})
       
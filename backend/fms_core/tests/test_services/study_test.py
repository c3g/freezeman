from django.test import TestCase

from fms_core.services.study import get_study
from fms_core.models import Workflow, Project, Study

class PlatformServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.workflow = Workflow.objects.get(name="PCR-free Illumina")
        self.project = Project.objects.create(name="TestStudy")
        self.letter_valid = "A"
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
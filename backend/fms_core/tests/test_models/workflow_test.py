from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Workflow


class WorkflowTest(TestCase):
    def setUp(self):
        self.name = "NewTestWorkflow"
        self.structure = "Test"

    def test_workflow(self):
        workflow = Workflow.objects.create(name=self.name,
                                           structure=self.structure)
        self.assertEqual(workflow.name, self.name)

    def test_no_structure(self):
        with self.assertRaises(ValidationError):
            try:
                workflow = Workflow.objects.create(name=self.name,
                                                   structure=None)
            except ValidationError as e:
                self.assertTrue("structure" in e.message_dict)
                raise e

    def test_duplicate_name(self):
        with self.assertRaises(ValidationError):
            # First Workflow is correct
            Workflow.objects.get_or_create(name=self.name, structure=self.structure)
            try:
                # Second Workflow should raise error.
                Workflow.objects.create(name=self.name, structure=self.structure)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e
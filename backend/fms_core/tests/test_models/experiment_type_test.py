from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import ExperimentType


class ExperimentTypeTest(TestCase):
    def setUp(self):
        self.workflow = "TestWorkflow"
        self.experiment_type, _ = ExperimentType.objects.get_or_create(workflow=self.workflow)

    def test_experiment_type(self):
        workflow = 'AnotherWorkflow'
        et = ExperimentType.objects.create(workflow=workflow)
        self.assertEqual(et.workflow, workflow)

    def test_missing_workflow(self):
        with self.assertRaises(ValidationError):
            try:
                ExperimentType.objects.create()
            except ValidationError as e:
                self.assertTrue('workflow' in e.message_dict)
                raise e

    def test_duplicate_workflow(self):
        with self.assertRaises(ValidationError):
            try:
                ExperimentType.objects.create(workflow=self.workflow)
            except ValidationError as e:
                self.assertTrue('workflow' in e.message_dict)
                raise e
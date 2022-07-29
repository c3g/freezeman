from django.test import TestCase
from django.core.exceptions import ValidationError

from fms_core.models import Dataset
from fms_core.tests.constants import create_dataset

class DatasetTest(TestCase):
    """ Test module for Dataset model """

    def setUp(self) -> None:
        pass

    def test_dataset(self):
        dataset = Dataset.objects.create(**create_dataset(project_name="project", run_name="run", lane="1"))
        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.project_name, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, "1")

    def test_invalid_lane(self):
        try:
            Dataset.objects.create(**create_dataset(project_name="project", run_name="run", lane="x"))
            self.fail("Invalid lane did not cause exception")
        except ValidationError as e:
            self.assertIn("The lane must be a positive integer", e.messages)
        except Exception as e:
            self.fail(f"Expected ValidationError exception but got '{repr(e)}'")

    def test_duplicate_dataset(self):
        Dataset.objects.create(**create_dataset(project_name="project", run_name="run", lane="1"))

        try:
            Dataset.objects.create(**create_dataset(project_name="project", run_name="run", lane="1"))
        except ValidationError as e:
            self.assertIn("There's already a dataset with identical project name 'project', run name 'run' and lane '1'", e.messages)
        except Exception as e:
            self.fail(f"Expected ValidationError exception but got '{repr(e)}'")

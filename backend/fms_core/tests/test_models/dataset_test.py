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

    def test_valid_lane(self):
        valid_lanes = ["1", "0", "10"]
        for valid_lane in valid_lanes:
            with self.subTest(msg=f"test_valid_lane: {valid_lane}"):
                try:
                    Dataset.objects.create(**create_dataset(project_name="project", run_name=f"run_{valid_lane}", lane=valid_lane))
                except Exception:
                    self.fail(f"Expected to create Dataset successfully with lane '{valid_lane}'")

    def test_invalid_lane(self):
        invalid_lanes = ["a", "-1", "00", "01"]
        for invalid_lane in invalid_lanes:
            with self.subTest(msg=f"test_invalid_lane: {invalid_lane}"):
                try:
                    Dataset.objects.create(**create_dataset(project_name="project", run_name=f"run_{invalid_lane}", lane=invalid_lane))
                    self.fail("Invalid lane did not cause exception")
                except ValidationError as e:
                    self.assertIn("The lane must be a positive integer", e.messages)
                except Exception as e:
                    self.fail(f"Expected ValidationError exception but got '{repr(e)}'")

    def test_duplicate_dataset(self):
        Dataset.objects.create(**create_dataset(project_name="project", run_name="run", lane="1"))

        valid_datasets = [
            dict(project_name="project", run_name="run", lane="1"),
            dict(project_name="PROJECT", run_name="RUN", lane="1"),
        ]
        for vd in valid_datasets:
            with self.subTest(msg=f"test_duplicate_dataset: {vd}"):
                try:
                    Dataset.objects.create(**create_dataset(**vd))
                except ValidationError as e:
                    self.assertIn(f"There's already a dataset with identical project name '{vd['project_name']}', run name '{vd['run_name']}' and lane '{vd['lane']}'", e.messages)
                except Exception as e:
                    self.fail(f"Expected ValidationError exception but got '{repr(e)}'")

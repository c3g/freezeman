from django.test import TestCase
from django.core.exceptions import ValidationError

from fms_core.models import Dataset

class DatasetTest(TestCase):
    """ Test module for Dataset model """

    def setUp(self) -> None:
        pass

    def test_dataset(self):
        dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane=1, project_name="test")
        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.external_project_id, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, 1)
        self.assertEqual(dataset.project_name, "test")

    def test_dataset_with_report(self):
        dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane=1, project_name="test", metric_report_url="https://www.FakeMetricReport.com")
        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.external_project_id, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, 1)
        self.assertEqual(dataset.project_name, "test")
        self.assertEqual(dataset.metric_report_url, "https://www.FakeMetricReport.com")

    def test_valid_lane(self):
        valid_lanes = [1, 0, 10]
        for valid_lane in valid_lanes:
            with self.subTest(msg=f"test_valid_lane: {valid_lane}"):
                try:
                    Dataset.objects.create(external_project_id="project", run_name=f"run_{valid_lane}", lane=valid_lane, project_name="test")
                except Exception:
                    self.fail(f"Expected to create Dataset successfully with lane '{valid_lane}'")

    def test_invalid_lane(self):
        invalid_lanes = [-1]
        for invalid_lane in invalid_lanes:
            with self.subTest(msg=f"test_invalid_lane: {invalid_lane}"):
                try:
                    Dataset.objects.create(external_project_id="project", run_name=f"run_{invalid_lane}", lane=invalid_lane, project_name="test")
                    self.fail("Invalid lane did not cause exception")
                except ValidationError as e:
                    self.assertIn("Ensure this value is greater than or equal to 0.", e.messages)

    def test_duplicate_dataset(self):
        Dataset.objects.create(external_project_id="project", run_name="run", lane=1, project_name="test")

        valid_datasets = [
            dict(external_project_id="project", run_name="run", lane=1, project_name="test"),
            dict(external_project_id="PROJECT", run_name="RUN", lane=1, project_name="TEST"),
        ]
        for vd in valid_datasets:
            with self.subTest(msg=f"test_duplicate_dataset: {vd}"):
                try:
                    Dataset.objects.create(**vd)
                except ValidationError as e:
                    self.assertIn(f"Dataset with this External project id, Run name and Lane already exists.", e.messages)
                except Exception as e:
                    self.fail(f"Expected ValidationError exception but got '{repr(e)}'")

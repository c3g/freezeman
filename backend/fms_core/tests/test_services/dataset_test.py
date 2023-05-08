from django.test import TestCase

from fms_core.models import Dataset, DatasetFile, Readset, Metric
from fms_core.services.dataset import create_dataset, create_dataset_file, reset_dataset_content, set_experiment_run_lane_validation_status
from fms_core.models._constants import ReleaseStatus, ValidationStatus

class DatasetServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.METRIC_REPORT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        

    def test_create_dataset(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, metric_report_url=self.METRIC_REPORT_URL)
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.external_project_id, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, 1)
        self.assertEqual(dataset.metric_report_url, self.METRIC_REPORT_URL)
    
    def test_create_dataset_without_metric_report(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1)
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.external_project_id, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, 1)
        self.assertIsNone(dataset.metric_report_url)

    def test_create_dataset_without_replace(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1)
        _, errors, _ = create_dataset(external_project_id="project", run_name="run", lane=1)
        self.assertTrue(errors)
    
    def test_create_dataset_with_replace(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, errors, warnings = create_dataset_file(readset, file_path="file_path", release_status=3)

        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, metric_report_url=self.METRIC_REPORT_URL, replace=True)
        self.assertIsNotNone(dataset)
        self.assertCountEqual(errors, [])
        if dataset:
            self.assertCountEqual(Readset.objects.filter(dataset=dataset.id), [])
            self.assertCountEqual(DatasetFile.objects.filter(readset=readset.id), [])
            self.assertEqual(dataset.metric_report_url, self.METRIC_REPORT_URL)

    def test_reset_dataset_content(self):
        dataset, _, _ = create_dataset(external_project_id="project", run_name="run", lane=1, metric_report_url=self.METRIC_REPORT_URL)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", release_status=ReleaseStatus.BLOCKED)
        metric = Metric.objects.create(readset=readset, name="Reads", metric_group="RunQC", value_numeric=1000)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(Readset.objects.count(), 1)
        self.assertEqual(Metric.objects.count(), 1)

        errors, warnings = reset_dataset_content(dataset)
        
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(DatasetFile.objects.count(), 0)
        self.assertEqual(Readset.objects.count(), 0)
        self.assertEqual(Metric.objects.count(), 0)
        

    def test_create_dataset_file(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", release_status=ReleaseStatus.BLOCKED)

        self.assertCountEqual(errors, [])
        self.assertCountEqual(warnings, [])
        self.assertIsNotNone(dataset_file)

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.readset, readset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.release_status, ReleaseStatus.BLOCKED)
        self.assertIsNotNone(dataset_file.release_status_timestamp)
        self.assertEqual(dataset_file.validation_status, ValidationStatus.AVAILABLE)
        self.assertIsNone(dataset_file.validation_status_timestamp)

    def test_create_dataset_file_with_status_released(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", release_status=ReleaseStatus.RELEASED, validation_status=ValidationStatus.PASSED)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)
        self.assertEqual(dataset_file.release_status, ReleaseStatus.RELEASED)
        self.assertIsNotNone(dataset_file.release_status_timestamp)
        self.assertEqual(dataset_file.validation_status, ValidationStatus.PASSED)
        self.assertIsNotNone(dataset_file.validation_status_timestamp)
    
    def test_create_dataset_file_with_validation_status_passed(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", validation_status=ValidationStatus.PASSED)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)
        self.assertEqual(dataset_file.release_status, ReleaseStatus.AVAILABLE)
        self.assertIsNone(dataset_file.release_status_timestamp)
        self.assertEqual(dataset_file.validation_status, ValidationStatus.PASSED)
        self.assertIsNotNone(dataset_file.validation_status_timestamp)

    def test_create_dataset_file_with_invalid_status(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", release_status=3)
        self.assertEqual(errors[0], "The release status can only be 0 (Available) or 1 (Released) or 2 (Blocked).")

    def test_set_experiment_run_lane_validation_status(self):
        dataset, _, _ = create_dataset(external_project_id="project", run_name="run", lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, _, _ = create_dataset_file(readset=readset, file_path="file_path")

        count, errors, warnings = set_experiment_run_lane_validation_status(run_name=dataset.run_name, lane=dataset.lane, validation_status=ValidationStatus.FAILED)

        dataset_file.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(count, 1)
        self.assertEqual(dataset_file.validation_status, ValidationStatus.FAILED)
        self.assertIsNotNone(dataset_file.validation_status_timestamp)
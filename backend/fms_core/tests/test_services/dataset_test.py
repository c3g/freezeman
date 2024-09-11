from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User

from fms_core.models import Dataset, DatasetFile, Readset, Metric
from fms_core.services.dataset import (create_dataset,
                                       create_dataset_file,
                                       reset_dataset_content,
                                       set_experiment_run_lane_validation_status,
                                       get_experiment_run_lane_validation_status)
from fms_core.models._constants import ReleaseStatus, ValidationStatus

class DatasetServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.METRIC_REPORT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        self.currentuser = User.objects.get(username="biobankadmin")

    def test_create_dataset(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT", metric_report_url=self.METRIC_REPORT_URL)
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.external_project_id, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, 1)
        self.assertEqual(dataset.metric_report_url, self.METRIC_REPORT_URL)
        self.assertEqual(dataset.project_name, "MY_NAME_IS_PROJECT")
    
    def test_create_dataset_without_metric_report(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.external_project_id, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, 1)
        self.assertEqual(dataset.project_name, "MY_NAME_IS_PROJECT")
        self.assertIsNone(dataset.metric_report_url)

    def test_create_dataset_without_replace(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        _, errors, _ = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        self.assertTrue(errors)
    
    def test_create_dataset_with_replace(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, errors, warnings = create_dataset_file(readset, file_path="file_path", size=3)

        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT_TOO", metric_report_url=self.METRIC_REPORT_URL, replace=True)
        self.assertIsNotNone(dataset)
        self.assertCountEqual(errors, [])
        if dataset:
            self.assertCountEqual(Readset.objects.filter(dataset=dataset.id), [])
            self.assertCountEqual(DatasetFile.objects.filter(readset=readset.id), [])
            self.assertEqual(dataset.metric_report_url, self.METRIC_REPORT_URL)
            self.assertEqual(dataset.project_name, "MY_NAME_IS_PROJECT_TOO")

    def test_reset_dataset_content(self):
        dataset, _, _ = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT", metric_report_url=self.METRIC_REPORT_URL)
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=dataset,
                                         release_status=ReleaseStatus.BLOCKED,
                                         release_status_timestamp=timezone.now(),
                                         released_by=self.currentuser)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", size=3)
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
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=dataset,
                                         release_status=ReleaseStatus.BLOCKED,
                                         release_status_timestamp=timezone.now(),
                                         released_by=self.currentuser)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", size=3)

        self.assertCountEqual(errors, [])
        self.assertCountEqual(warnings, [])
        self.assertIsNotNone(dataset_file)

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.readset, readset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.AVAILABLE)
        self.assertIsNone(dataset_file.readset.validation_status_timestamp)

    def test_create_dataset_file_with_validation_status_passed(self):
        dataset, errors, warnings = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=dataset,
                                         validation_status=ValidationStatus.PASSED,
                                         validation_status_timestamp=timezone.now(),
                                         validated_by=self.currentuser)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", size=3)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)
        self.assertEqual(dataset_file.readset.release_status, ReleaseStatus.AVAILABLE)
        self.assertIsNone(dataset_file.readset.release_status_timestamp)
        self.assertIsNone(dataset_file.readset.released_by)
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.PASSED)
        self.assertIsNotNone(dataset_file.readset.validation_status_timestamp)
        self.assertEqual(dataset_file.readset.validated_by, self.currentuser)

    def test_set_experiment_run_lane_validation_status(self):
        dataset, _, _ = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, _, _ = create_dataset_file(readset=readset, file_path="file_path", size=3)

        count, errors, warnings = set_experiment_run_lane_validation_status(run_name=dataset.run_name, lane=dataset.lane, validation_status=ValidationStatus.FAILED, validated_by=self.currentuser)

        dataset_file.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(count, 1)
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.FAILED)
        self.assertIsNotNone(dataset_file.readset.validation_status_timestamp)
        self.assertEqual(dataset_file.readset.validated_by, self.currentuser)

    def test_get_experiment_run_lane_validation_status(self):
        dataset, _, _ = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, _, _ = create_dataset_file(readset=readset, file_path="file_path", size=3)

        validation_status, errors, warnings = get_experiment_run_lane_validation_status(run_name=dataset.run_name, lane=dataset.lane)

        dataset_file.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(validation_status, ValidationStatus.AVAILABLE)
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.AVAILABLE)
        self.assertIsNone(dataset_file.readset.validation_status_timestamp)

        count, errors, warnings = set_experiment_run_lane_validation_status(run_name=dataset.run_name, lane=dataset.lane, validation_status=ValidationStatus.FAILED, validated_by=self.currentuser)

        validation_status, errors, warnings = get_experiment_run_lane_validation_status(run_name=dataset.run_name, lane=dataset.lane)

        dataset_file.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(validation_status, ValidationStatus.FAILED)
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.FAILED)
        self.assertIsNotNone(dataset_file.readset.validation_status_timestamp)
        self.assertEqual(dataset_file.readset.validated_by, self.currentuser)
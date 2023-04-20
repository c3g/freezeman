from django.test import TestCase

from fms_core.models import Dataset, DatasetFile
import fms_core.services.dataset as service
from fms_core.models._constants import ReleaseStatus, ValidationStatus

class DatasetServicesTestCase(TestCase):
    def test_create_dataset(self):
        dataset, errors, warnings = service.create_dataset(external_project_id="project", run_name="run", lane=1)
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.external_project_id, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, 1)

    def test_create_dataset_without_replace(self):
        dataset, errors, warnings = service.create_dataset(external_project_id="project", run_name="run", lane=1)
        _, errors, _ = service.create_dataset(external_project_id="project", run_name="run", lane=1)
        self.assertTrue(errors)
    
    def test_create_dataset_with_replace(self):
        dataset, errors, warnings = service.create_dataset(external_project_id="project", run_name="run", lane=1)

        dataset_file, errors, warnings = service.create_dataset_file(dataset, file_path="file_path", sample_name="sample_name", release_status=3)

        dataset, errors, warnings = service.create_dataset(external_project_id="project", run_name="run", lane=1, replace=True)
        self.assertIsNotNone(dataset)
        self.assertCountEqual(errors, [])
        if dataset:
            self.assertCountEqual(DatasetFile.objects.filter(dataset=dataset.id), [])

    def test_create_dataset_file(self):
        dataset, errors, warnings = service.create_dataset(external_project_id="project", run_name="run", lane=1)

        dataset_file, errors, warnings = service.create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_status=ReleaseStatus.BLOCKED)

        self.assertCountEqual(errors, [])
        self.assertCountEqual(warnings, [])
        self.assertIsNotNone(dataset_file)

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.dataset, dataset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.sample_name, "sample_name")
        self.assertEqual(dataset_file.release_status, ReleaseStatus.BLOCKED)
        self.assertIsNone(dataset_file.release_status_timestamp)
        self.assertEqual(dataset_file.validation_status, ValidationStatus.AVAILABLE)
        self.assertIsNone(dataset_file.validation_status_timestamp)

    def test_create_dataset_file_with_status_released(self):
        dataset, errors, warnings = service.create_dataset(external_project_id="project", run_name="run", lane=1)

        dataset_file, errors, warnings = service.create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_status=ReleaseStatus.RELEASED, validation_status=ValidationStatus.PASSED)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)
        self.assertEqual(dataset_file.release_status, ReleaseStatus.RELEASED)
        self.assertIsNotNone(dataset_file.release_status_timestamp)
        self.assertEqual(dataset_file.validation_status, ValidationStatus.PASSED)
        self.assertIsNotNone(dataset_file.validation_status_timestamp)
    
    def test_create_dataset_file_with_validation_status_passed(self):
        dataset, errors, warnings = service.create_dataset(external_project_id="project", run_name="run", lane=1)

        dataset_file, errors, warnings = service.create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", validation_status=ValidationStatus.PASSED)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)
        self.assertEqual(dataset_file.release_status, ReleaseStatus.AVAILABLE)
        self.assertIsNone(dataset_file.release_status_timestamp)
        self.assertEqual(dataset_file.validation_status, ValidationStatus.PASSED)
        self.assertIsNotNone(dataset_file.validation_status_timestamp)

    def test_create_dataset_file_with_invalid_status(self):
        dataset, errors, warnings = service.create_dataset(external_project_id="project", run_name="run", lane=1)
        dataset_file, errors, warnings = service.create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_status=3)
        self.assertEqual(errors[0], "The release status can only be 0 (Available) or 1 (Released) or 2 (Blocked).")

    def test_set_experiment_run_lane_validation_status(self):
        dataset, _, _ = service.create_dataset(external_project_id="project", run_name="run", lane=1)

        dataset_file, _, _ = service.create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name")

        count, errors, warnings = service.set_experiment_run_lane_validation_status(run_name=dataset.run_name, lane=dataset.lane, validation_status=ValidationStatus.FAILED)

        dataset_file.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(count, 1)
        self.assertEqual(dataset_file.validation_status, ValidationStatus.FAILED)
        self.assertIsNotNone(dataset_file.validation_status_timestamp)
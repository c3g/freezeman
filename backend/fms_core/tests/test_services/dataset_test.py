from datetime import datetime
from typing import List, Tuple
from django.test import TestCase

from fms_core.models import Dataset, DatasetFile
from fms_core.tests.constants import create_dataset, create_dataset_file
import fms_core.services.dataset as service
from fms_core.models._constants import ReleaseStatus

class DatasetServicesTestCase(TestCase):
    def create_dataset(self, external_project_id="project", run_name="run", lane=1) -> Tuple[Dataset, List[str], List[str]]:
        return service.create_dataset(**create_dataset(external_project_id=external_project_id, run_name=run_name, lane=lane))
    
    def create_dataset_file(self, dataset, file_path="file_path", sample_name="sample_name", release_status=ReleaseStatus.BLOCKED) -> Tuple[DatasetFile, List[str], List[str]]:
        dataset_file_dict = create_dataset_file(dataset=dataset, file_path=file_path, sample_name=sample_name, release_status=release_status)
        dataset_file_dict.pop("release_status_timestamp")
        return service.create_dataset_file(**dataset_file_dict)

    def test_create_dataset(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(external_project_id="project", run_name="run", lane=1))
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.external_project_id, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, 1)

    def test_create_dataset_without_replace(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(external_project_id="project", run_name="run", lane=1))
        _, errors, _ = service.create_dataset(**create_dataset(external_project_id="project", run_name="run", lane=1))
        self.assertTrue(errors)
    
    def test_create_dataset_with_replace(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(external_project_id="project", run_name="run", lane=1))

        dataset_file_dict = create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_status=3)
        dataset_file_dict.pop("release_status_timestamp")
        dataset_file, errors, warnings = service.create_dataset_file(**dataset_file_dict)

        dataset, errors, warnings = service.create_dataset(**create_dataset(external_project_id="project", run_name="run", lane=1), replace=True)
        self.assertIsNotNone(dataset)
        self.assertCountEqual(errors, [])
        if dataset:
            self.assertCountEqual(DatasetFile.objects.filter(dataset=dataset.id), [])

    def test_create_dataset_file(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(external_project_id="project", run_name="run", lane=1))

        dataset_file_dict = create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_status=ReleaseStatus.BLOCKED, release_status_timestamp=None)
        dataset_file_dict.pop("release_status_timestamp")
        dataset_file, errors, warnings = service.create_dataset_file(**dataset_file_dict)

        self.assertCountEqual(errors, [])
        self.assertCountEqual(warnings, [])
        self.assertIsNotNone(dataset_file)

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.dataset, dataset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.sample_name, "sample_name")
        self.assertEqual(dataset_file.release_status, ReleaseStatus.BLOCKED)
        self.assertIsNone(dataset_file.release_status_timestamp)

    def test_create_dataset_file_with_status_released(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(external_project_id="project", run_name="run", lane=1))

        dataset_file_dict = create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_status=ReleaseStatus.RELEASED, release_status_timestamp=None)
        dataset_file_dict.pop("release_status_timestamp")
        dataset_file, errors, warnings = service.create_dataset_file(**dataset_file_dict)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)
        self.assertEqual(dataset_file.release_status, ReleaseStatus.RELEASED)
        self.assertIsNone(dataset_file.release_status_timestamp)

    def test_create_dataset_file_with_invalid_status(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(external_project_id="project", run_name="run", lane=1))
        dataset_file_dict = create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_status=3, release_status_timestamp=None)
        dataset_file_dict.pop("release_status_timestamp")
        dataset_file, errors, warnings = service.create_dataset_file(**dataset_file_dict)
        self.assertEqual(errors[0], "The release status can only be 0 (Available) or 1 (Released) or 2 (Blocked).")

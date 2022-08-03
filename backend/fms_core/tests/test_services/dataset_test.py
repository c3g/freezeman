from datetime import datetime
from typing import List, Tuple
from django.test import TestCase

from fms_core.models import Dataset, DatasetFile
from fms_core.tests.constants import create_dataset, create_dataset_file
import fms_core.services.dataset as service
from fms_core.models._constants import ReleaseFlag

class DatasetServicesTestCase(TestCase):
    def create_dataset(self, project_name="project", run_name="run", lane="1") -> Tuple[Dataset, List[str], List[str]]:
        return service.create_dataset(**create_dataset(project_name=project_name, run_name=run_name, lane=lane))
    
    def create_dataset_file(self, dataset, file_path="file_path", sample_name="sample_name", release_flag=ReleaseFlag.BLOCK, release_flag_timestamp=None) -> Tuple[DatasetFile, List[str], List[str]]:
        dataset_file_dict = create_dataset_file(dataset=dataset, file_path=file_path, sample_name=sample_name, release_flag=release_flag, release_flag_timestamp=release_flag_timestamp)
        dataset_file_dict.pop("release_flag_timestamp")
        return service.create_dataset_file(**dataset_file_dict)

    def test_create_dataset(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(project_name="project", run_name="run", lane="1"))
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.project_name, "project")
        self.assertEqual(dataset.run_name, "run")
        self.assertEqual(dataset.lane, "1")

    def test_create_dataset_file(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(project_name="project", run_name="run", lane="1"))

        dataset_file_dict = create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_flag=ReleaseFlag.BLOCK, release_flag_timestamp=None)
        dataset_file_dict.pop("release_flag_timestamp")
        dataset_file, errors, warnings = service.create_dataset_file(**dataset_file_dict)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.dataset, dataset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.sample_name, "sample_name")
        self.assertEqual(dataset_file.release_flag, ReleaseFlag.BLOCK)
        self.assertEqual(dataset_file.release_flag_timestamp, None)

    def test_create_dataset_file_with_flag_released(self):
        dataset, errors, warnings = service.create_dataset(**create_dataset(project_name="project", run_name="run", lane="1"))

        dataset_file_dict = create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_flag=ReleaseFlag.RELEASE, release_flag_timestamp=None)
        dataset_file_dict.pop("release_flag_timestamp")
        dataset_file, errors, warnings = service.create_dataset_file(**dataset_file_dict)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)
        self.assertEqual(dataset_file.release_flag, ReleaseFlag.RELEASE)
        self.assertIsNotNone(dataset_file.release_flag_timestamp)
    
    def test_set_release_flag(self):
        dataset, *_ = self.create_dataset()
        self.create_dataset_file(dataset)
        self.create_dataset_file(dataset)

        dataset_files = DatasetFile.objects.filter(dataset=dataset)

        # release all flags
        service.set_release_flag(dataset.id, ReleaseFlag.RELEASE)
        self.assertEqual(len(dataset_files.filter(release_flag=ReleaseFlag.RELEASE)), 2)

        # block all flags
        service.set_release_flag(dataset.id, ReleaseFlag.BLOCK)
        self.assertEqual(len(dataset_files.filter(release_flag=ReleaseFlag.BLOCK)), 2)

        # # by default: if all blocked then release all flags
        # service.set_release_flag(dataset.id)
        # self.assertEqual(len(dataset_files.filter(release_flag=ReleaseFlag.RELEASE)), 2)

        # # by default: if at least one is released, and at least is blocked, then all files should be blocked
        # dataset_file = dataset_files.first()
        # dataset_file.release_flag = ReleaseFlag.BLOCK
        # dataset_file.save()

        # service.set_release_flag(dataset.id)
        # self.assertEqual(len(dataset_files.filter(release_flag=ReleaseFlag.BLOCK)), 2)

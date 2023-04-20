from django.test import TestCase
from django.core.exceptions import ValidationError

from fms_core.models import Dataset, DatasetFile
from fms_core.models._constants import ReleaseStatus

class DatasetFileTest(TestCase):
    """ Test module for DatasetFile model """

    def setUp(self) -> None:
        pass

    def test_dataset_file(self):
        dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane="1")
        dataset_file = DatasetFile.objects.create(dataset=dataset, file_path="file_path", sample_name="sample_name")

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.dataset, dataset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.sample_name, "sample_name")
        self.assertEqual(dataset_file.release_status, ReleaseStatus.AVAILABLE)
        self.assertEqual(dataset_file.release_status_timestamp, None)


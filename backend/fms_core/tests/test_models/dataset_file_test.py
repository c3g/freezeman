from django.test import TestCase
from django.core.exceptions import ValidationError

from fms_core.models import Dataset, DatasetFile
from fms_core.tests.constants import create_dataset, create_dataset_file
from fms_core.models._constants import ReleaseFlag

class DatasetFileTest(TestCase):
    """ Test module for DatasetFile model """

    def setUp(self) -> None:
        pass

    def test_dataset_file(self):
        dataset = Dataset.objects.create(**create_dataset(project_name="project", run_name="run", lane="1"))
        dataset_file = DatasetFile.objects.create(**create_dataset_file(dataset=dataset, file_path="file_path", sample_name="sample_name", release_flag=ReleaseFlag.BLOCK, release_flag_timestamp=None))
        self.assertEqual(dataset_file.dataset, dataset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.sample_name, "sample_name")
        self.assertEqual(dataset_file.release_flag, ReleaseFlag.BLOCK)
        self.assertEqual(dataset_file.release_flag_timestamp, None)


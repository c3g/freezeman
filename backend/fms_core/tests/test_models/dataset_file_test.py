from django.test import TestCase
from django.core.exceptions import ValidationError

from fms_core.models import Dataset, DatasetFile, Readset
from fms_core.models._constants import ValidationStatus

class DatasetFileTest(TestCase):
    """ Test module for DatasetFile model """

    def setUp(self) -> None:
        self.dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane="1", project_name="test")
        self.readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)

    def test_dataset_file(self):
        dataset_file = DatasetFile.objects.create(readset=self.readset, file_path="file_path",size=3)

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.readset.dataset, self.dataset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.readset.sample_name, "My")
        self.assertEqual(dataset_file.size, 3)


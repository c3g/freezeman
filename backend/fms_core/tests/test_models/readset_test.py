from django.test import TestCase

from fms_core.models import Readset, Dataset

class ReadsetTest(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane=1)

    def test_readset(self):
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)
        self.assertEqual(readset.name, "My_Readset")
        self.assertEqual(readset.sample_name, "My")
        self.assertEqual(readset.dataset, self.dataset)

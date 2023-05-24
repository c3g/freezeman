from django.test import TestCase

from fms_core.models import Readset, Dataset, Container, Sample
from fms_core.tests.constants import create_sample, create_sample_container

class ReadsetTest(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane=1)

    def test_readset(self):
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)
        self.assertEqual(readset.name, "My_Readset")
        self.assertEqual(readset.sample_name, "My")
        self.assertEqual(readset.dataset, self.dataset)

    def test_readset_with_derived_sample(self):
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
        sample = Sample.objects.create(**create_sample(container=self.valid_container, comment="This is a sample."))
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=self.dataset,
                                         derived_sample=sample.derived_sample_not_pool)
        self.assertEqual(readset.name, "My_Readset")
        self.assertEqual(readset.sample_name, "My")
        self.assertEqual(readset.dataset, self.dataset)
        self.assertEqual(readset.derived_sample, sample.derived_sample_not_pool)
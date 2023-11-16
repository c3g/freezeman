from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError

from fms_core.models import Readset, Dataset, Container, Sample
from fms_core.models._constants import ValidationStatus, ReleaseStatus
from fms_core.tests.constants import create_sample, create_sample_container

class ReadsetTest(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane=1, project_name="test")

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

    def test_readset_with_validation_timestamp(self):
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=self.dataset,
                                         validation_status=ValidationStatus.PASSED,
                                         validation_status_timestamp=timezone.now())
        self.assertEqual(readset.name, "My_Readset")
        self.assertEqual(readset.sample_name, "My")
        self.assertEqual(readset.dataset, self.dataset)
        self.assertIsNotNone(readset.validation_status_timestamp)

    def test_readset_without_validation_timestamp(self):
        with self.assertRaises(ValidationError):
            try:
                Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset, validation_status=ValidationStatus.PASSED)
            except ValidationError as e:
                self.assertTrue('validation_status_timestamp' in e.message_dict)
                raise e

    def test_readset_without_release_timestamp(self):
        with self.assertRaises(ValidationError):
            try:
                Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset, release_status=ReleaseStatus.RELEASED)
            except ValidationError as e:
                self.assertTrue('release_status_timestamp' in e.message_dict)
                raise e
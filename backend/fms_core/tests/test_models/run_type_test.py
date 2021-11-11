from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Platform, Protocol, RunType


class RunTypeTest(TestCase):
    def setUp(self):
        self.name = "Infinium Global Screening Array-24"
        self.platform, _ = Platform.objects.get_or_create(name="ILLUMINA_ARRAY")
        self.protocol, _ = Protocol.objects.get_or_create(name="Illumina Infinium Preparation")
        self.run_type, _ = RunType.objects.get_or_create(name=self.name, platform=self.platform, protocol=self.protocol)


    def test_run_type(self):
        name = 'InfiniumTestRunType'
        rt = RunType.objects.create(name=name, platform=self.platform, protocol=self.protocol)
        self.assertEqual(rt.name, name)

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                RunType.objects.create(platform=self.platform, protocol=self.protocol)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_duplicate_name(self):
        with self.assertRaises(ValidationError):
            try:
                RunType.objects.create(name=self.name, platform=self.platform, protocol=self.protocol)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e
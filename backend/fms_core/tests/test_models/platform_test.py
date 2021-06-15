from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Platform

class PlatformTest(TestCase):
    def setUp(self):
        self.name = "Platform1"
        self.platform, _ = Platform.objects.get_or_create(name=self.name)

    def test_platform(self):
        name = "NameFortest_platform"
        p = Platform.objects.create(name=name)
        self.assertEqual(p.name, name)

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                Platform.objects.create()
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_duplicate(self):
        with self.assertRaises(ValidationError):
            try:
                Platform.objects.create(name=self.name)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e
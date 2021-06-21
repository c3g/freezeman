from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import InstrumentType, Platform


class InstrumentTypeTest(TestCase):
    def setUp(self):
        self.type = "TestType"
        self.platform, _ = Platform.objects.get_or_create(name="PlatformTest")
        self.instrument_type, _ = InstrumentType.objects.get_or_create(type=self.type, platform=self.platform)

    def test_instrument_type(self):
        type = "Type2"
        it = InstrumentType.objects.create(type=type, platform=self.platform)
        self.assertEqual(it.type, type)
        self.assertEqual(it.platform, self.platform)

    def test_missing_type(self):
        with self.assertRaises(ValidationError):
            try:
                InstrumentType.objects.create()
            except ValidationError as e:
                self.assertTrue('type' in e.message_dict)
                raise e

    def test_duplicate_type(self):
        with self.assertRaises(ValidationError):
            try:
                InstrumentType.objects.create(type=self.type)
            except ValidationError as e:
                self.assertTrue('type' in e.message_dict)
                raise e


    def test_missing_platform(self):
        with self.assertRaises(ValidationError):
            try:
                InstrumentType.objects.create(type=self.type)
            except ValidationError as e:
                self.assertTrue('platform' in e.message_dict)
                raise e
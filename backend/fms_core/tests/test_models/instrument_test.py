from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (
    InstrumentType,
    Instrument,
    Platform,
)

class InstrumentTest(TestCase):
    def setUp(self):
        self.platform, _ = Platform.objects.get_or_create(name="PlatformTest")
        self.type, _ = InstrumentType.objects.get_or_create(type="MyType")
        self.name = "Instrument1"
        self.instrument, _ = Instrument.objects.get_or_create(platform=self.platform,
                                                              name=self.name,
                                                              type=self.type)

    def test_instrument(self):
        name = "InstrumentTest"
        i = Instrument.objects.create(platform=self.platform, name=name, type=self.type)
        self.assertEqual(i.name, name)
        self.assertEqual(i.type, self.type)

    def test_missing_platform(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(type=self.type, name="Instrument_missing_platform")
            except ValidationError as e:
                self.assertTrue('platform' in e.message_dict)
                raise e

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(platform=self.platform, type=self.type)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_invalid_name(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(platform=self.platform,
                                          name="name with spaces, and comma",
                                          type=self.type)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_duplicate_name(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(platform=self.platform,
                                          name=self.name,
                                          type=self.type)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_missing_type(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(platform=self.platform,
                                          name="Instrument_missing_type")
            except ValidationError as e:
                self.assertTrue('type' in e.message_dict)
                raise e
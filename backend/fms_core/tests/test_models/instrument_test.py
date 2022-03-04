from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (
    InstrumentType,
    Instrument,
    Platform,
)
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE

class InstrumentTest(TestCase):
    def setUp(self):
        self.platform, _ = Platform.objects.get_or_create(name="PlatformTest")
        self.type, _ = InstrumentType.objects.get_or_create(type="MyType",
                                                            platform=self.platform,
                                                            index_read_5_prime=INDEX_READ_FORWARD,
                                                            index_read_3_prime=INDEX_READ_REVERSE)
        self.name = "Instrument1"
        self.instrument, _ = Instrument.objects.get_or_create(name=self.name, type=self.type)

    def test_instrument(self):
        name = "InstrumentTest"
        i = Instrument.objects.create(name=name, type=self.type)
        self.assertEqual(i.name, name)
        self.assertEqual(i.type, self.type)

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(type=self.type)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_invalid_name(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(name="name with spaces, and comma",
                                          type=self.type)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_duplicate_name(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(name=self.name,
                                          type=self.type)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_missing_type(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(name="Instrument_missing_type")
            except ValidationError as e:
                self.assertTrue('type' in e.message_dict)
                raise e
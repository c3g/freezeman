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
        self.serial_id = "IAMTEST12345"
        Instrument.objects.get_or_create(name=self.name, type=self.type, serial_id=self.serial_id)

    def test_instrument(self):
        name = "InstrumentTest"
        serial_id = "IAMTEST54321"
        i = Instrument.objects.create(name=name, type=self.type, serial_id=serial_id)
        self.assertEqual(i.name, name)
        self.assertEqual(i.type, self.type)
        self.assertEqual(i.serial_id, serial_id)

    def test_missing_name(self):
        serial_id = "IAMTEST54321"
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(type=self.type, serial_id=serial_id)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_invalid_name(self):
        serial_id = "IAMTEST54321"
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(name="name with spaces, and comma",
                                          type=self.type,
                                          serial_id=serial_id)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_duplicate_name(self):
        serial_id = "IAMTEST54321"
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(name=self.name,
                                          type=self.type,
                                          serial_id=serial_id)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e
    
    def test_duplicate_serial_id(self):
        name = "InstrumentTest"
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(name=name,
                                          type=self.type,
                                          serial_id=self.serial_id)
            except ValidationError as e:
                self.assertTrue('serial_id' in e.message_dict)
                raise e

    def test_missing_type(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(name="Instrument_missing_type", serial_id=self.serial_id)
            except ValidationError as e:
                self.assertTrue('type' in e.message_dict)
                raise e
    
    def test_missing_serial_id(self):
        with self.assertRaises(ValidationError):
            try:
                Instrument.objects.create(name=self.name, type=self.type)
            except ValidationError as e:
                self.assertTrue('serial_id' in e.message_dict)
                raise e
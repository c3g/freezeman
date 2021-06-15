from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import InstrumentType


class InstrumentTypeTest(TestCase):
    def setUp(self):
        self.type = "TestType"
        self.instrument_type, _ = InstrumentType.objects.get_or_create(type=self.type)

    def test_instrument_type(self):
        type = "Type2"
        it = InstrumentType.objects.create(type=type)
        self.assertEqual(it.type, type)

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
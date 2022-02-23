from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import InstrumentType, Platform
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE

class InstrumentTypeTest(TestCase):
    def setUp(self):
        self.type = "TestType"
        self.platform, _ = Platform.objects.get_or_create(name="PlatformTest")
        self.instrument_type, _ = InstrumentType.objects.get_or_create(type=self.type,
                                                                       platform=self.platform,
                                                                       index_read_5_prime=INDEX_READ_FORWARD,
                                                                       index_read_3_prime=INDEX_READ_REVERSE)

    def test_instrument_type(self):
        type = "Type2"
        it = InstrumentType.objects.create(type=type,
                                           platform=self.platform,
                                           index_read_5_prime=INDEX_READ_REVERSE,
                                           index_read_3_prime=INDEX_READ_FORWARD)
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

    def test_missing_index_read_5_prime(self):
        with self.assertRaises(ValidationError):
            try:
                InstrumentType.objects.create(type=self.type,
                                              platform=self.platform,
                                              index_read_3_prime=INDEX_READ_REVERSE)
            except ValidationError as e:
                self.assertTrue('index_read_5_prime' in e.message_dict)
                raise e

    def test_missing_index_read_3_prime(self):
        with self.assertRaises(ValidationError):
            try:
                InstrumentType.objects.create(type=self.type,
                                              platform=self.platform,
                                              index_read_5_prime=INDEX_READ_REVERSE)
            except ValidationError as e:
                self.assertTrue('index_read_3_prime' in e.message_dict)
                raise e
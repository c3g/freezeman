from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Protocol


class ProtocolTest(TestCase):
    def setUp(self):
        self.protocol = Protocol.objects.create(name="myprotocol")

    def test_protocol(self):
        self.assertEqual(self.protocol.name, "myprotocol")

    def test_no_protocol_name(self):
        with self.assertRaises(ValidationError):
            try:
                Protocol.objects.create()
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_existing_protocol_name(self):
        with self.assertRaises(ValidationError):
            try:
                Protocol.objects.create(name="myprotocol")
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e
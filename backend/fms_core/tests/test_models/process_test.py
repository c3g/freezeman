from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (
    Process,
    Protocol,
)


class ProcessTest(TestCase):
    def setUp(self):
        self.protocol, _ = Protocol.objects.get_or_create(name="Update")

    def test_process(self):
        process = Process.objects.create(protocol=self.protocol, comment="mycomment")
        self.assertEqual(process.protocol.name, self.protocol.name)
        self.assertEqual(process.comment, "mycomment")

    def test_missing_protocol(self):
        with self.assertRaises(ValidationError):
            try:
                Process.objects.create(comment="mycomment")
            except ValidationError as e:
                self.assertTrue('protocol' in e.message_dict)
                raise e
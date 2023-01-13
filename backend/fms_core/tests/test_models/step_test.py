from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Step, Protocol


class StepTest(TestCase):
    def setUp(self):
        self.protocol = Protocol.objects.get(name="Extraction")
        self.name_new = "NewTestStep"

    def test_step(self):
        step = Step.objects.create(name=self.name_new,
                                   protocol=self.protocol)
        self.assertEqual(step.name, self.name_new)

    def test_no_protocol(self):
        with self.assertRaises(ValidationError):
            try:
                Step.objects.create(name=self.name_new,
                                    protocol=None)
            except ValidationError as e:
                self.assertTrue("protocol" in e.message_dict)
                raise e

    def test_duplicate_name(self):
        with self.assertRaises(ValidationError):
            # First Step is correct
            Step.objects.get_or_create(name=self.name_new, protocol=self.protocol)
            try:
                # Second Step should raise error.
                Step.objects.create(name=self.name_new, protocol=self.protocol)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e
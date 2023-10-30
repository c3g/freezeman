from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Step, Protocol
from fms_core.models._constants import StepType

class StepTest(TestCase):
    def setUp(self):
        self.protocol = Protocol.objects.get(name="Extraction")
        self.name_new = "NewTestStep"

    def test_step(self):
        step = Step.objects.create(name=self.name_new,
                                   protocol=self.protocol,
                                   type=StepType.PROTOCOL)
        self.assertEqual(step.name, self.name_new)
        self.assertEqual(step.type, StepType.PROTOCOL)

    def test_no_protocol(self):
        with self.assertRaises(ValidationError):
            try:
                Step.objects.create(name=self.name_new,
                                    protocol=None,
                                    type=StepType.PROTOCOL)
            except ValidationError as e:
                self.assertTrue("protocol" in e.message_dict)
                raise e
    
    def test_no_protocol_automation(self):
        step = Step.objects.create(name=self.name_new,
                                   protocol=None,
                                   type=StepType.AUTOMATION)
        self.assertEqual(step.name, self.name_new)
        self.assertIsNone(step.protocol)

    def test_duplicate_name(self):
        with self.assertRaises(ValidationError):
            # First Step is correct
            Step.objects.get_or_create(name=self.name_new, protocol=self.protocol, type=StepType.PROTOCOL)
            try:
                # Second Step should raise error.
                Step.objects.create(name=self.name_new, protocol=self.protocol, type=StepType.PROTOCOL)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e
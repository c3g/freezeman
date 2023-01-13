from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import StepOrder, Workflow, Step, Protocol


class StepOrderTest(TestCase):
    def setUp(self):
        protocol1 = Protocol.objects.get(name="Extraction")
        protocol2 = Protocol.objects.get(name="Sample Quality Control")
        self.step1, _ = Step.objects.get_or_create(name="Extraction (test)", protocol=protocol1)
        self.step2, _ = Step.objects.get_or_create(name="Sample QC (test)", protocol=protocol2)
        self.order = 1
        self.workflow = Workflow.objects.create(name="Test Workflow",
                                                structure="Test")

    def test_step_order(self):
        step_order_2 = StepOrder.objects.create(step=self.step2,
                                                next_step_order=None,
                                                workflow=self.workflow,
                                                order=self.order)
        self.assertEqual(step_order_2.step, self.step2)
        self.assertEqual(step_order_2.next_step_order, None)
        step_order_1 = StepOrder.objects.create(step=self.step1,
                                                next_step_order=step_order_2,
                                                workflow=self.workflow,
                                                order=self.order + 1)
        self.assertEqual(step_order_1.step, self.step1)
        self.assertEqual(step_order_1.next_step_order, step_order_2)

    def test_no_step(self):
        with self.assertRaises(ValidationError):
            try:
                StepOrder.objects.create(step=None,
                                         next_step_order=None,
                                         workflow=self.workflow,
                                         order=self.order)
            except ValidationError as e:
                self.assertTrue("step" in e.message_dict)
                raise e

    def test_no_order(self):
        with self.assertRaises(ValidationError):
            try:
                StepOrder.objects.create(step=self.step1,
                                         next_step_order=None,
                                         workflow=self.workflow,
                                         order=None)
            except ValidationError as e:
                self.assertTrue("order" in e.message_dict)
                raise e

    def test_no_workflow(self):
        with self.assertRaises(ValidationError):
            try:
                StepOrder.objects.create(step=self.step1,
                                         next_step_order=None,
                                         workflow=None,
                                         order=self.order)
            except ValidationError as e:
                self.assertTrue("workflow" in e.message_dict)
                raise e

    def test_duplicate_order(self):
        with self.assertRaises(ValidationError):
            # First StepOrder is correct
            StepOrder.objects.create(step=self.step1,
                                     next_step_order=None,
                                     workflow=self.workflow,
                                     order=self.order)
            try:
                # Second Workflow should raise error.
                StepOrder.objects.create(step=self.step1,
                                         next_step_order=None,
                                         workflow=self.workflow,
                                         order=self.order)
            except ValidationError as e:
                self.assertTrue('__all__' in e.message_dict)
                raise e
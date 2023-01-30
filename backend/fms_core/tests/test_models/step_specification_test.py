from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import StepSpecification, Step


class StepSpecificationTest(TestCase):
    def setUp(self):
        self.step = Step.objects.get(name="Extraction (DNA)")
        self.display_name_new = "TestSpec"
        self.sheet_name = "Samples"
        self.column_name = "TestColumn"
        self.value = "Tested"

    def test_step_specification(self):
        step_specification = StepSpecification.objects.create(display_name=self.display_name_new,
                                                              sheet_name=self.sheet_name,
                                                              column_name=self.column_name,
                                                              step=self.step,
                                                              value=self.value)
        self.assertEqual(step_specification.display_name, self.display_name_new)

    def test_no_step(self):
        with self.assertRaises(ValidationError):
            try:
                StepSpecification.objects.create(display_name=self.display_name_new,
                                                 sheet_name=self.sheet_name,
                                                 column_name=self.column_name,
                                                 step=None,
                                                 value=self.value)
            except ValidationError as e:
                self.assertTrue("step" in e.message_dict)
                raise e

    def test_no_value(self):
        with self.assertRaises(ValidationError):
            try:
                StepSpecification.objects.create(display_name=self.display_name_new,
                                                 sheet_name=self.sheet_name,
                                                 column_name=self.column_name,
                                                 step=self.step,
                                                 value=None)
            except ValidationError as e:
                self.assertTrue("value" in e.message_dict)
                raise e
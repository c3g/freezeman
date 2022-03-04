from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Sequence


class SequenceTest(TestCase):
    def setUp(self):
        self.value_empty = ""
        self.value = "ACGTTCTCAAC"

        #for duplicate test
        self.duplicate_value = self.value

        #for invalid value test
        self.invalid_value = "actgtgggc"


    def test_sequence(self):
        my_sequence, _ = Sequence.objects.get_or_create(value=self.value)

        self.assertEqual(my_sequence.value, self.value)

    def test_empty_sequence(self):
        my_sequence, _ = Sequence.objects.get_or_create(value=self.value_empty)

        self.assertEqual(my_sequence.value, self.value_empty)

    def test_missing_value(self):
        with self.assertRaises(ValidationError):
            try:
                sequence_without_value = Sequence.objects.create()
            except ValidationError as e:
                self.assertTrue("value" in e.message_dict)
                raise e

    def test_duplicate_sequence_with_value(self):
        with self.assertRaises(ValidationError):
            # First Sequence is valid
            Sequence.objects.get_or_create(value=self.value)

            try:
                # Second Sequence has the same value, should be invalid
                Sequence.objects.create(value=self.duplicate_value)
            except ValidationError as e:
                self.assertTrue("value" in e.message_dict)
                raise e

    def test_sequence_with_invalid_value(self):
        with self.assertRaises(ValidationError):
            try:
                # Sequence has invalid value (lower case), should be invalid
                Sequence.objects.create(value=self.invalid_value)
            except ValidationError as e:
                self.assertTrue("value" in e.message_dict)
                raise e
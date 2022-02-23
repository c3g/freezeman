from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import IndexSet


class IndexSetTest(TestCase):
    def setUp(self):
        self.name = "ThisIsValidSetName"

        #for duplicate test
        self.duplicate_name = self.name

        #for similar name test
        self.similar_name = "thisisvalidsetname"


    def test_index_set(self):
        my_index_set = IndexSet.objects.create(name=self.name)

        self.assertEqual(my_index_set.name, self.name)

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                index_set_without_name = IndexSet.objects.create()
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_duplicate_index_set_with_name(self):
        with self.assertRaises(ValidationError):
            # First IndexSet is valid
            IndexSet.objects.create(name=self.name)

            try:
                # Second IndexSet has the same name, should be invalid
                IndexSet.objects.create(name=self.duplicate_name)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_index_set_with_similar_name(self):
        with self.assertRaises(ValidationError):
            # First IndexSet is valid
            IndexSet.objects.create(name=self.name)

            try:
                # Second IndexSet has a similar name, but different upper/lower cases, should be invalid
                IndexSet.objects.create(name=self.similar_name)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e
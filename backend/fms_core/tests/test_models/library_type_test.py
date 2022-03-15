from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import LibraryType


class LibraryTypeTest(TestCase):
    def setUp(self):
        self.name = "ThisIsValidLibraryTypeName"

        #for duplicate test
        self.duplicate_name = self.name

        #for similar name test
        self.similar_name = "thisisvalidlibrarytypename"


    def test_library_type(self):
        my_library_type = LibraryType.objects.create(name=self.name)

        self.assertEqual(my_library_type.name, self.name)

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                library_type_without_name = LibraryType.objects.create()
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_duplicate_library_type_with_name(self):
        with self.assertRaises(ValidationError):
            # First LibraryType is valid
            LibraryType.objects.create(name=self.name)

            try:
                # Second LibraryType has the same name, should be invalid
                LibraryType.objects.create(name=self.duplicate_name)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_library_type_with_similar_name(self):
        with self.assertRaises(ValidationError):
            # First LibraryType is valid
            LibraryType.objects.create(name=self.name)

            try:
                # Second LibraryType has a similar name, but different upper/lower cases, should be invalid
                LibraryType.objects.create(name=self.similar_name)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e
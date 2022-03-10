from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Library, LibraryType, Platform, Index


class LibraryTest(TestCase):
    def setUp(self):
        self.library_type = LibraryType.objects.create(name="ThisIsValidLibraryTypeName")
        self.platform = Platform.objects.create(name="TestPlatform")
        self.index = Index.objects.get(name="Index_1")


    def test_library(self):
        my_library = Library.objects.create(library_type=self.library_type,
                                            platform=self.platform,
                                            index=self.index,)

        self.assertEqual(my_library.library_type.name, "ThisIsValidLibraryTypeName")
        self.assertEqual(my_library.platform.name, "TestPlatform")
        self.assertEqual(my_library.index.name, "Index_1")

    def test_missing_library_type(self):
        with self.assertRaises(ValidationError):
            try:
                library_without_library_type = Library.objects.create(platform=self.platform,
                                                                      index=self.index,)
            except ValidationError as e:
                self.assertTrue("library_type" in e.message_dict)
                raise e

    def test_missing_platform(self):
        with self.assertRaises(ValidationError):
            try:
                library_without_platform = Library.objects.create(library_type=self.library_type,
                                                                  index=self.index,)
            except ValidationError as e:
                self.assertTrue("platform" in e.message_dict)
                raise e

    def test_missing_index(self):
        with self.assertRaises(ValidationError):
            try:
                library_without_index = Library.objects.create(library_type=self.library_type,
                                                               platform=self.platform,)
            except ValidationError as e:
                self.assertTrue("index" in e.message_dict)
                raise e

    def test_library_with_negative_library_size(self):
        with self.assertRaises(ValidationError):
            try:
                library_with_negative_library_size = Library.objects.create(library_type=self.library_type,
                                                                            platform=self.platform,
                                                                            index=self.index,
                                                                            library_size = -1,)
            except ValidationError as e:
                self.assertTrue("library_size" in e.message_dict)
                raise e
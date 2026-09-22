from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import ParentProject

class ParentProjectTest(TestCase):
    def setUp(self):
        self.external_id = "P000242"
        self.name = "Test Hercules Project"

    def test_parent_project(self):
        my_parent_project = ParentProject.objects.create(name=self.name, external_id=self.external_id)

        self.assertEqual(my_parent_project.name, self.name)
        self.assertEqual(my_parent_project.external_id, self.external_id)

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                parent_project = ParentProject.objects.create(external_id=self.external_id)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_missing_external_id(self):
        with self.assertRaises(ValidationError):
            try:
                parent_project = ParentProject.objects.create(name=self.name)
            except ValidationError as e:
                self.assertTrue("external_id" in e.message_dict)
                raise e

    def test_duplicate_parent_project_with_external_id(self):
        with self.assertRaises(ValidationError):
            # First Parent Project is valid
            ParentProject.objects.create(name=self.name, external_id=self.external_id)

            try:
                # Second Parent Project has the same external_id, should be invalid
                ParentProject.objects.create(name=self.name, external_id=self.external_id)
            except ValidationError as e:
                self.assertTrue("external_id" in e.message_dict)
                raise e

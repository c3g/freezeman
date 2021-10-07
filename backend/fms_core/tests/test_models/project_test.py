from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (
    Project,
)

from datetime import datetime


class ProjectTest(TestCase):
    def setUp(self):
        self.name = "TestProject"
        self.principal_investigator = "Guillaume Bourque"
        self.requestor_name = "Sebastian Ballesteros"
        self.requestor_email = "sballesteros@mcgill.ca"
        self.status = "Open"
        self.targeted_end_date = "2022-08-12"
        self.comment = "This is a test comment"

        #for duplicate test
        self.duplicate_name = "TestDuplicateProject"


    def test_project(self):
        my_project = Project.objects.create(name=self.name,
                                            principal_investigator=self.principal_investigator,
                                            requestor_name=self.requestor_name,
                                            requestor_email=self.requestor_email,
                                            targeted_end_date=self.targeted_end_date,
                                            comment=self.comment)
        self.assertEqual(my_project.name, self.name)
        self.assertEqual(my_project.principal_investigator, self.principal_investigator)
        self.assertEqual(my_project.requestor_name, self.requestor_name)
        self.assertEqual(my_project.requestor_email, self.requestor_email)
        self.assertEqual(my_project.status, self.status)
        self.assertEqual(my_project.comment, self.comment)
        self.assertEqual(my_project.targeted_end_date, datetime.strptime(self.targeted_end_date, "%Y-%m-%d").date())

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                er_without_et = Project.objects.create(principal_investigator=self.principal_investigator,
                                                       requestor_name=self.requestor_name,
                                                       requestor_email=self.requestor_email,
                                                       status=self.status)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_duplicate_project_with_name(self):
        with self.assertRaises(ValidationError):
            # First Project is valid
            Project.objects.create(name=self.duplicate_name,
                                   principal_investigator=self.principal_investigator,
                                   status=self.status,
                                   targeted_end_date=self.targeted_end_date)

            try:
                # Second Project has the same name, should be invalid
                Project.objects.create(name=self.duplicate_name,
                                       principal_investigator=self.principal_investigator,
                                       requestor_name=self.requestor_name,
                                       requestor_email=self.requestor_email,
                                       status=self.status,
                                       targeted_end_date=self.targeted_end_date)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e
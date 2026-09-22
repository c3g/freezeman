from django.test import TestCase
import datetime

from fms_core.services.project import create_project, get_project, create_parent_project, create_full_project

class ProjectServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.external_id = "P999999"
        self.external_name = "Project Name For Testing"
        self.valid_project_name = "MyValidProject"
        self.invalid_project_name = "MyInvalidProject"
        self.principal_investigator = "PepitoPerez"
        self.requestor_name = "PietroLaroche"
        self.requestor_email = "PietroLaroche@stone.com"
        self.valid_status = "Open"
        self.invalid_status = "Ongoing"
        self.valid_target_end_date = "2030-12-21"
        self.invalid_target_end_date = "01-01-2010"
        self.comment = "Forgot to take out the dog."

    def test_create_valid_project(self):
        project, errors, warnings = create_project(name=self.valid_project_name,
                                                   status=self.valid_status,
                                                   targeted_end_date=self.valid_target_end_date)

        self.assertEqual(project.name, self.valid_project_name)
        self.assertEqual(project.status, self.valid_status)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_create_project_invalid_name(self):
        project, errors, warnings = create_project(name=None,
                                                   status=self.invalid_status,
                                                   targeted_end_date=self.invalid_target_end_date)

        self.assertEqual(project, None)
        self.assertTrue("name" in errors[0])

    def test_create_project_invalid_status(self):
        project, errors, warnings = create_project(name=self.valid_project_name,
                                                   status=self.invalid_status,
                                                   targeted_end_date=self.valid_target_end_date)

        self.assertEqual(project, None)
        self.assertTrue("status" in errors[0])

    def test_create_project_invalid_target_date(self):
        project, errors, warnings = create_project(name=self.valid_project_name,
                                                   status=self.valid_status,
                                                   targeted_end_date=self.invalid_target_end_date)

        self.assertEqual(project, None)
        self.assertTrue("targeted_end_date" in errors[0])

    def test_get_valid_project(self):
        project, errors, warnings = create_project(name=self.valid_project_name,
                                                   status=self.valid_status,
                                                   targeted_end_date=self.valid_target_end_date)

        project, errors, warnings = get_project(name=self.valid_project_name)

        self.assertEqual(project.name, self.valid_project_name)
        self.assertEqual(project.status, self.valid_status)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_get_invalid_project(self):
        project, errors, warnings = get_project(name=self.invalid_project_name)

        self.assertEqual(project,  None)
        self.assertEqual(errors, [f"Could not find Project with name {self.invalid_project_name}"])
        self.assertEqual(warnings, [])

        project, errors, warnings = get_project()

        self.assertEqual(project, None)
        self.assertEqual(errors, [f"Name is required to get a project."])
        self.assertEqual(warnings, [])

    def test_create_parent_project(self):
        parent_project, errors, warnings = create_parent_project(external_id=self.external_id,
                                                                 name=self.external_name,
                                                                 principal_investigator=self.principal_investigator,
                                                                 requestor_name=self.requestor_name,
                                                                 requestor_email=self.requestor_email)

        self.assertIsNotNone(parent_project)
        self.assertEqual(parent_project.external_id, self.external_id)
        self.assertEqual(parent_project.name, self.external_name)
        self.assertEqual(parent_project.principal_investigator, self.principal_investigator)
        self.assertEqual(parent_project.requestor_name, self.requestor_name)
        self.assertEqual(parent_project.requestor_email, self.requestor_email)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_create_parent_project_without_external_id(self):
        parent_project, errors, warnings = create_parent_project(external_id=None,
                                                                 name=self.external_name,
                                                                 principal_investigator=self.principal_investigator,
                                                                 requestor_name=self.requestor_name,
                                                                 requestor_email=self.requestor_email)

        self.assertIsNone(parent_project)
        self.assertEqual(errors, ["{'external_id': ['This field cannot be null.']}"])
        self.assertEqual(warnings, [])

    def test_create_parent_project_without_external_name(self):
            parent_project, errors, warnings = create_parent_project(external_id=self.external_id,
                                                                     name=None,
                                                                     principal_investigator=self.principal_investigator,
                                                                     requestor_name=self.requestor_name,
                                                                     requestor_email=self.requestor_email)
    
            self.assertIsNone(parent_project)
            self.assertEqual(errors, ["{'name': ['This field cannot be null.']}"])
            self.assertEqual(warnings, [])

    def test_create_full_project(self):
        project, errors, warnings = create_full_project(name=self.valid_project_name,
                                                        principal_investigator=self.principal_investigator,
                                                        requestor_name=self.requestor_name,
                                                        requestor_email=self.requestor_email,
                                                        external_id=self.external_id,
                                                        external_name=self.external_name,
                                                        status=self.valid_status,
                                                        targeted_end_date=self.valid_target_end_date,
                                                        comment=self.comment)

        self.assertIsNotNone(project)
        self.assertEqual(project.name, self.valid_project_name)
        self.assertEqual(project.parent_project.principal_investigator, self.principal_investigator)
        self.assertEqual(project.parent_project.requestor_name, self.requestor_name)
        self.assertEqual(project.parent_project.requestor_email, self.requestor_email)
        self.assertEqual(project.parent_project.external_id, self.external_id)
        self.assertEqual(project.parent_project.name, self.external_name)
        self.assertEqual(project.status, self.valid_status)
        self.assertEqual(project.targeted_end_date, datetime.date(2030, 12, 21))
        self.assertEqual(project.comment, self.comment)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
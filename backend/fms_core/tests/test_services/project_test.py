from django.test import TestCase

from fms_core.services.project import create_project, get_project


class ProjectServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.valid_project_name = "MyValidProject"
        self.invalid_project_name = "MyInvalidProject"
        self.principal_investigator = "PepitoPerez"
        self.valid_status = "Open"
        self.invalid_status = "Ongoing"
        self.valid_target_end_date = "2030-12-21"
        self.invalid_target_end_date = "01-01-2010"

    def test_create_valid_project(self):
        project, errors, warnings = create_project(name=self.valid_project_name,
                                                   principal_investigator=self.principal_investigator,
                                                   status=self.valid_status,
                                                   targeted_end_date=self.valid_target_end_date)

        self.assertEqual(project.name, self.valid_project_name)
        self.assertEqual(project.principal_investigator, self.principal_investigator)
        self.assertEqual(project.status, self.valid_status)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_create_project_invalid_name(self):
        project, errors, warnings = create_project(name=None,
                                                   principal_investigator=self.principal_investigator,
                                                   status=self.invalid_status,
                                                   targeted_end_date=self.invalid_target_end_date)

        self.assertEqual(project, None)
        self.assertTrue("name" in errors[0])

    def test_create_project_invalid_status(self):
        project, errors, warnings = create_project(name=self.valid_project_name,
                                                   principal_investigator=self.principal_investigator,
                                                   status=self.invalid_status,
                                                   targeted_end_date=self.valid_target_end_date)

        self.assertEqual(project, None)
        self.assertTrue("status" in errors[0])

    def test_create_project_invalid_target_date(self):
        project, errors, warnings = create_project(name=self.valid_project_name,
                                                   principal_investigator=self.principal_investigator,
                                                   status=self.valid_status,
                                                   targeted_end_date=self.invalid_target_end_date)

        self.assertEqual(project, None)
        self.assertTrue("targeted_end_date" in errors[0])

    def test_get_valid_project(self):
        project, errors, warnings = create_project(name=self.valid_project_name,
                                                   principal_investigator=self.principal_investigator,
                                                   status=self.valid_status,
                                                   targeted_end_date=self.valid_target_end_date)

        project, errors, warnings = get_project(name=self.valid_project_name)

        self.assertEqual(project.name, self.valid_project_name)
        self.assertEqual(project.principal_investigator, self.principal_investigator)
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
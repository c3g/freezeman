from django.test import TestCase

from fms_core.models import Container, SampleKind

from fms_core.services.project import create_project
from fms_core.services.project_link_samples import create_link, remove_link
from fms_core.services.sample import create_full_sample


class ProjectLinkSamplesServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.valid_sample_name = "SampleTest"
        self.valid_project_name = "MyValidProject"
        self.invalid_project_name = "MyInvalidProject"
        self.principal_investigator = "PepitoPerez"
        self.valid_status = "Open"
        self.invalid_status = "Ongoing"
        self.valid_target_end_date = "2030-12-21"
        self.invalid_target_end_date = "01-01-2010"
        self.sk_BLOOD = SampleKind.objects.get(name="BLOOD")

        self.test_container = Container.objects.create(barcode="TESTBARCODE",
                                                  name="TestName",
                                                  kind="tube"
                                                  )

        self.project, errors, warnings = create_project(name=self.valid_project_name,
                                                   principal_investigator=self.principal_investigator,
                                                   status=self.valid_status,
                                                   targeted_end_date=self.valid_target_end_date)

        self.full_sample, errors, warnings = create_full_sample(name=self.valid_sample_name,
                                                           volume=20,
                                                           collection_site="TestCollectionSite",
                                                           container=self.test_container,
                                                           sample_kind=self.sk_BLOOD,
                                                           creation_date="2022-01-01"
                                                           )

    def test_create_valid_link(self):
        link, errors, warnings = create_link(self.full_sample, self.project)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_create_duplicate_link(self):
        link, errors, warnings = create_link(self.full_sample, self.project)
        duplicate_link, errors, warnings = create_link(self.full_sample, self.project)

        self.assertEqual(duplicate_link, None)
        self.assertTrue("already associated" in errors[0])

    def test_remove_valid_link(self):
        link, errors, warnings = create_link(self.full_sample, self.project)
        num_deleted, errors, warnings = remove_link(self.full_sample, self.project)

        self.assertEqual(num_deleted, 1)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_remove_invalid_link(self):
        num_deleted, errors, warnings = remove_link(self.full_sample, self.project)

        self.assertEqual(num_deleted,  0)
        self.assertEqual(errors, [f"Sample [{self.valid_sample_name}] is not currently associated to project [{self.valid_project_name}]."])
        self.assertEqual(warnings, [])

    def test_missing_project(self):
        link, errors, warnings = create_link(self.full_sample, None)
        self.assertEqual(errors, [f"Unable to process sample or project information."])

        num_deleted, errors, warnings = remove_link(self.full_sample, None)
        self.assertEqual(errors, [f"Unable to process sample or project information."])

    def test_missing_sample(self):
        link, errors, warnings = create_link(None, self.project)
        self.assertEqual(errors, [f"Unable to process sample or project information."])

        num_deleted, errors, warnings = remove_link(None, self.project)
        self.assertEqual(errors, [f"Unable to process sample or project information."])

    def test_invalid_sample(self):
        link, errors, warnings = create_link(self.project, self.project)
        self.assertEqual(errors, [f"Invalid sample or project objects."])

        num_deleted, errors, warnings = remove_link(self.project, self.project)
        self.assertEqual(errors, [f"Invalid sample or project objects."])

    def test_invalid_project(self):
        link, errors, warnings = create_link(self.full_sample, self.full_sample)
        self.assertEqual(errors, [f"Invalid sample or project objects."])

        num_deleted, errors, warnings = remove_link(self.project, self.project)
        self.assertEqual(errors, [f"Invalid sample or project objects."])



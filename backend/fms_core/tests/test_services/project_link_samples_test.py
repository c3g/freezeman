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
        link_created, errors, warnings = create_link(self.full_sample, self.project)
        self.assertTrue(link_created)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_create_duplicate_link(self):
        link_created, errors, warnings = create_link(self.full_sample, self.project)
        link_not_created_again, errors, warnings = create_link(self.full_sample, self.project)

        self.assertTrue(link_created)
        self.assertFalse(link_not_created_again)
        self.assertTrue("already associated" in warnings[0])

    def test_remove_valid_link(self):
        link_created, errors, warnings = create_link(self.full_sample, self.project)
        link_removed, errors, warnings = remove_link(self.full_sample, self.project)

        self.assertTrue(link_created)
        self.assertTrue(link_removed)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_remove_invalid_link(self):
        link_not_removed, errors, warnings = remove_link(self.full_sample, self.project)

        self.assertFalse(link_not_removed)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [f"Sample [{self.valid_sample_name}] is not currently associated to project [{self.valid_project_name}]."])

    def test_missing_project(self):
        link_not_created, errors, warnings = create_link(self.full_sample, None)

        self.assertFalse(link_not_created)
        self.assertEqual(errors, [f"Unable to process sample or project information."])

        link_not_removed, errors, warnings = remove_link(self.full_sample, None)
        self.assertFalse(link_not_removed)
        self.assertEqual(errors, [f"Unable to process sample or project information."])

    def test_missing_sample(self):
        link_not_created, errors, warnings = create_link(None, self.project)
        self.assertFalse(link_not_created)
        self.assertEqual(errors, [f"Unable to process sample or project information."])

        link_not_removed, errors, warnings = remove_link(None, self.project)
        self.assertFalse(link_not_removed)
        self.assertEqual(errors, [f"Unable to process sample or project information."])

    def test_invalid_sample(self):
        link_not_created, errors, warnings = create_link(self.project, self.project)
        self.assertFalse(link_not_created)
        self.assertEqual(errors, [f"Invalid sample or project objects."])

        link_not_removed, errors, warnings = remove_link(self.project, self.project)
        self.assertFalse(link_not_removed)
        self.assertEqual(errors, [f"Invalid sample or project objects."])

    def test_invalid_project(self):
        link_not_created, errors, warnings = create_link(self.full_sample, self.full_sample)
        self.assertFalse(link_not_created)
        self.assertEqual(errors, [f"Invalid sample or project objects."])

        link_not_removed, errors, warnings = remove_link(self.project, self.project)
        self.assertFalse(link_not_removed)
        self.assertEqual(errors, [f"Invalid sample or project objects."])



from django.test import TestCase

from fms_core.models import Container, SampleKind, Workflow, Project, Study

from fms_core.services.project import add_sample_to_study, create_project
from fms_core.services.project_link_samples import create_link, remove_link
from fms_core.services.sample import create_full_sample

class ProjectAddSamplesToStudyTestCase(TestCase):
    def setUp(self) -> None:
        # Create shared models
        principal_investigator = "PepitoPerez"
        valid_status = "Open"
        valid_target_end_date = "2030-12-21"
        sk_DNA, _ = SampleKind.objects.get_or_create(name="DNA", is_extracted=True, concentration_required=True)
        workflow = Workflow.objects.get(name="PCR-free Illumina")
        self.qc_step = 2
        self.normalization_step = 3

        # project 1 models
        container1 = Container.objects.create(barcode="TESTBARCODE1",
                                                  name="TestName1",
                                                  kind="tube")
        self.sample_project1, _, _ = create_full_sample(name="Sample1",
                                            volume=20,
                                            collection_site="TestCollectionSite",
                                            container=container1,
                                            sample_kind=sk_DNA,
                                            creation_date="2022-01-01")
        self.project1, _, _ = create_project(name="Project1",
                                         principal_investigator=principal_investigator,
                                         status=valid_status,
                                         targeted_end_date=valid_target_end_date)
        create_link(self.sample_project1, self.project1)
        self.study_project1_A = Study.objects.create(letter='A',
                                          project=self.project1,
                                          workflow=workflow,
                                          start=2,
                                          end=3)
        self.study_project1_B = Study.objects.create(letter='B',
                                            project=self.project1,
                                            workflow=workflow,
                                            start=2,
                                            end=3)

        # project 2 models
        self.project2, _, _ = create_project(name="Project2",
                                         principal_investigator=principal_investigator,
                                         status=valid_status,
                                         targeted_end_date=valid_target_end_date)
        self.study_project2_A = Study.objects.create(letter='A',
                                          project=self.project2,
                                          workflow=workflow,
                                          start=2,
                                          end=3)

        # no project models
        test_container_no_project = Container.objects.create(barcode="TESTBARCODE3",
                                                  name="TestName3",
                                                  kind="tube")
        self.sample_no_project, _, _ = create_full_sample(name="Sample3",
                                            volume=20,
                                            collection_site="TestCollectionSite",
                                            container=test_container_no_project,
                                            sample_kind=sk_DNA,
                                            creation_date="2022-01-01")

    def test_valid_add_sample_to_studies(self):
        errors, warnings = add_sample_to_study(self.sample_project1, self.project1, self.study_project1_A.letter)
        self.assertEqual(dict(errors), {})
        self.assertEqual(dict(warnings), {})

        errors, warnings = add_sample_to_study(self.sample_project1, self.project1, self.study_project1_A.letter, self.normalization_step)
        self.assertEqual(dict(errors), {})
        self.assertEqual(dict(warnings), {})

        errors, warnings = add_sample_to_study(self.sample_project1, self.project1, self.study_project1_B.letter)
        self.assertEqual(dict(errors), {})
        self.assertEqual(dict(warnings), {})

    def test_sample_must_be_linked_to_the_same_project(self):
        errors, warnings = add_sample_to_study(self.sample_no_project, self.project1, self.study_project1_A.letter)
        self.assertEqual(errors.get("add_sample_to_study"), [f"Sample [{self.sample_no_project.name}] is not linked to project [{self.project1.name}]."])
        self.assertEqual(dict(warnings), {})

        errors, warnings = add_sample_to_study(self.sample_project1, self.project2, self.study_project2_A.letter)
        self.assertEqual(errors.get("add_sample_to_study"), [f"Sample [{self.sample_project1.name}] is not linked to project [{self.project2.name}]."])
        self.assertEqual(dict(warnings), {})


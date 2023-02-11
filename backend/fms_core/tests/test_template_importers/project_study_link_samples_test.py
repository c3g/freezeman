from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
import datetime

from fms_core.template_importer.importers import ProjectStudyLinkSamples
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

from fms_core.models import SampleKind, Taxon, DerivedSample, Workflow, Study, SampleNextStep, StepOrder

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.services.project import create_project
from fms_core.services.project_link_samples import create_link
from fms_core.services.sample_next_step import queue_sample_to_study_workflow



class ProjectStudyLinkSamplesTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ProjectStudyLinkSamples()
        self.file = APP_DATA_ROOT / "Project_study_link_samples_v4_0_0.xlsx"
        ContentType.objects.clear_cache()

        self.invalid_template_tests = ["Project_study_link_samples_v4_0_0_invalid_project.xlsx",
                                       "Project_study_link_samples_v4_0_0_invalid_sample.xlsx",]

        self.warning_template_tests = ["Project_study_link_samples_v4_0_0_invalid_sample_2.xlsx",
                                       "Project_study_link_samples_v4_0_0_invalid_sample_3.xlsx",]

        #Projects for Link
        self.project1_name = 'ProjectTest1'
        self.project2_name = 'ProjectTest2'
        self.project3_name = 'ProjectTest3'

        #Samples for Link
        self.sample1_name = 'SampleTestForLink1'
        self.sample2_name = 'SampleTestForLink2'
        self.sample3_name = 'SampleTestForUnlink'

        #For studies 
        self.study_letter1 = "A"
        self.study_letter2 = "B"
        self.start = 1
        self.end = 7

        self.prefill_data()

    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
        taxon = Taxon.objects.get(name='Homo sapiens')
        

        container1, errors, warnings = create_container(barcode='CONTAINER4PROJECTLINKSAMPLES1', kind='Tube', name='Container4ProjectLinkSamples1')
        container2, errors, warnings = create_container(barcode='CONTAINER4PROJECTLINKSAMPLES2', kind='Tube', name='Container4ProjectLinkSamples2')
        container3, errors, warnings = create_container(barcode='CONTAINER4PROJECTLINKSAMPLES3', kind='Tube', name='Container4ProjectLinkSamples3')

        individual, _, errors, warnings = get_or_create_individual(name='Individual4ProjectLinkSamples', taxon=taxon)

        self.sample1, _, _ = create_full_sample(name=self.sample1_name, volume=100, concentration=25,
                                                collection_site='TestCaseSite', creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                                                container=container1, individual=individual, sample_kind=sample_kind)

        self.sample2, _, _ = create_full_sample(name=self.sample2_name, volume=80, concentration=20,
                                                collection_site='TestCaseSite', creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                                                container=container2, individual=individual, sample_kind=sample_kind)

        self.sample3, _, _ = create_full_sample(name=self.sample3_name, volume=80, concentration=20,
                                                collection_site='TestCaseSite', creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                                                container=container3, individual=individual, sample_kind=sample_kind)

        self.project1, _, _ = create_project(name=self.project1_name)
        self.project2, _, _ = create_project(name=self.project2_name)
        self.project3, _, _ = create_project(name=self.project3_name)

        #Studies 
        self.workflow1 = Workflow.objects.get(name="PCR-free Illumina")
        self.workflow2 = Workflow.objects.get(name="PCR-enriched Illumina")
        self.study1 = Study.objects.create(letter=self.study_letter1,
                                           project=self.project1,
                                           workflow=self.workflow1,
                                           start=self.start,
                                           end=self.end)
        
        self.study2 = Study.objects.create(letter=self.study_letter2,
                                           project=self.project1,
                                           workflow=self.workflow1,
                                           start=self.start,
                                           end=self.end)

        #Create link manually to test REMOVE project action
        create_link(sample=self.sample3, project=self.project3)

        #Queue sample manually to study 2 to test REMOVE study (create link to bypass the project validation)
        create_link(sample=self.sample3, project=self.project1)
        queue_sample_to_study_workflow(sample_obj=self.sample3, study_obj=self.study2)

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        #Custom tests for each template
        self.assertEqual(len(DerivedSample.objects.filter(project__isnull=False).all()), 3)
        self.assertFalse(DerivedSample.objects.filter(samples=self.sample1, project=self.project3).exists())
        self.assertTrue(DerivedSample.objects.filter(samples=self.sample1, project=self.project1).exists())
        self.assertTrue(DerivedSample.objects.filter(samples=self.sample2, project=self.project2).exists())
        self.assertFalse(DerivedSample.objects.filter(samples=self.sample3, project=self.project3).exists())

        # Test that sample 1 is queued twice in the same workflow but different steps
        self.assertEqual(SampleNextStep.objects.filter(sample=self.sample1, studies=self.study1).count(), 2)

        step_order_1 = StepOrder.objects.get(order=1, workflow=self.study1.workflow)
        self.assertTrue(SampleNextStep.objects.filter(sample=self.sample1, studies=self.study1, step_order=step_order_1).exists())

        step_order_2 = StepOrder.objects.get(order=3, workflow=self.study1.workflow)
        self.assertTrue(SampleNextStep.objects.filter(sample=self.sample1, studies=self.study1, step_order=step_order_2).exists())

        # Test that sample 3 was successfully removed from study
        self.assertFalse(SampleNextStep.objects.filter(sample=self.sample3, studies=self.study2).exists())

    def test_invalid_project_study_link_samples(self):
        for f in self.invalid_template_tests:
            s = transaction.savepoint()
            result = load_template(importer=self.importer, file=TEST_DATA_ROOT / f)
            self.assertEqual(result['valid'], False)
            transaction.savepoint_rollback(s)

    def test_warning_project_study_link_samples(self):
        for f in self.warning_template_tests:
            s = transaction.savepoint()
            result = load_template(importer=self.importer, file=TEST_DATA_ROOT / f)
            self.assertEqual(result['valid'], True)
            self.assertEqual(len(result["result_previews"][0]["rows"][0]['warnings']), 1)
            transaction.savepoint_rollback(s)


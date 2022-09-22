from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
import datetime

from fms_core.template_importer.importers import ProjectLinkSamples
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

from fms_core.models import SampleKind, Taxon, DerivedSample

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.services.project import create_project
from fms_core.services.project_link_samples import create_link



class ProjectLinkSamplesTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ProjectLinkSamples()
        self.file = APP_DATA_ROOT / "Project_link_samples_v3_5_0.xlsx"
        ContentType.objects.clear_cache()

        self.invalid_template_tests = ["Project_link_samples_v3_5_0_invalid_project.xlsx",
                                       "Project_link_samples_v3_5_0_invalid_sample.xlsx",
                                       "Project_link_samples_v3_5_0_invalid_sample_2.xlsx",
                                       "Project_link_samples_v3_5_0_invalid_sample_3.xlsx",]

        #Projects for Link
        self.project1_name = 'ProjectTest1'
        self.project2_name = 'ProjectTest2'
        self.project3_name = 'ProjectTest3'

        #Samples for Link
        self.sample1_name = 'SampleTestForLink1'
        self.sample2_name = 'SampleTestForLink2'
        self.sample3_name = 'SampleTestForUnlink'

        self.prefill_data()

    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
        taxon = Taxon.objects.get(name='Homo sapiens')
        

        (container1, errors, warnings) = create_container(barcode='CONTAINER4PROJECTLINKSAMPLES1', kind='Tube', name='Container4ProjectLinkSamples1')
        (container2, errors, warnings) = create_container(barcode='CONTAINER4PROJECTLINKSAMPLES2', kind='Tube', name='Container4ProjectLinkSamples2')
        (container3, errors, warnings) = create_container(barcode='CONTAINER4PROJECTLINKSAMPLES3', kind='Tube', name='Container4ProjectLinkSamples3')

        (individual, errors, warnings) = get_or_create_individual(name='Individual4ProjectLinkSamples', taxon=taxon)

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

        #Create link manually to test REMOVE action
        create_link(sample=self.sample3, project=self.project3)

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        #Custom tests for each template
        self.assertEqual(len(DerivedSample.objects.filter(project__isnull=False).all()), 2)
        self.assertTrue(DerivedSample.objects.filter(samples=self.sample1, project=self.project3).exists())
        self.assertFalse(DerivedSample.objects.filter(samples=self.sample1, project=self.project1).exists())
        self.assertTrue(DerivedSample.objects.filter(samples=self.sample2, project=self.project2).exists())
        self.assertFalse(DerivedSample.objects.filter(samples=self.sample3, project=self.project3).exists())

    def test_invalid_project_link_samples(self):
        for f in self.invalid_template_tests:
            s = transaction.savepoint()
            result = load_template(importer=self.importer, file=TEST_DATA_ROOT / f)
            self.assertEqual(result['valid'], False)
            transaction.savepoint_rollback(s)


from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (
    Container,
    SampleKind,
    Project,
    Sample,
    SampleByProject,
    Individual,
)

from fms_core.tests.constants import (
    create_container,
    create_individual,
    create_sample,
    create_sample_container,
)

from datetime import datetime


class SampleByProjectTest(TestCase):
    def setUp(self):
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='sballest'))
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube22',
                                                                                  barcode='S09876543'))
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD")

        #Valid Objects
        self.valid_project_name = "TestValidProject"
        self.valid_sample_name = "TestValidSample"
        self.valid_sample = Sample.objects.create(
            **create_sample(self.sample_kind_BLOOD, self.valid_individual, self.valid_container, name="TestValidSample",))

        self.valid_project = Project.objects.create(name="TestValidProject")


    def test_sample_by_project(self):
        my_sample_by_project = SampleByProject.objects.create(project=self.valid_project,
                                                              sample=self.valid_sample)

        self.assertEqual(my_sample_by_project.project, self.valid_project)
        self.assertEqual(my_sample_by_project.sample, self.valid_sample)

    def test_invalid_sample(self):
        invalid_sample = Sample()
        with self.assertRaises(ValidationError):
            try:
                er_without_et = SampleByProject.objects.create(project=self.valid_project,
                                                               sample=invalid_sample)
            except ValidationError as e:
                self.assertTrue("sample" in e.message_dict)
                raise e

    def test_invalid_project(self):
        invalid_project = Project()
        with self.assertRaises(ValidationError):
            try:
                er_without_et = SampleByProject.objects.create(project=invalid_project,
                                                               sample=self.valid_sample,)
            except ValidationError as e:
                self.assertTrue("project" in e.message_dict)
                raise e

    def test_duplicate_link(self):
        my_sample_by_project = SampleByProject.objects.create(project=self.valid_project,
                                                              sample=self.valid_sample)
        with self.assertRaises(ValidationError):
            try:
                my_sample_by_project_duplicated = SampleByProject.objects.create(project=self.valid_project,
                                                                                 sample=self.valid_sample)
            except ValidationError as e:
                raise e
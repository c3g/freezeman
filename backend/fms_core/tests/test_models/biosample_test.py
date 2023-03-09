from django.test import TestCase

from django.core.exceptions import ValidationError

from fms_core.models import Biosample, Individual
from fms_core.tests.constants import create_individual,create_biosample

class BiosampleTest(TestCase):
    """ Test module for Biosample model """

    def setUp(self) -> None:
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))

    def test_biosample(self):
        biosample = Biosample.objects.create(**create_biosample(individual=self.valid_individual))
        self.assertEqual(Biosample.objects.count(), 1)
        self.assertEqual(biosample.alias, "53")
        self.assertEqual(biosample.collection_site, "Site1")
        self.assertEqual(biosample.individual_name, "jdoe")
        self.assertEqual(biosample.individual_sex, Individual.SEX_UNKNOWN)
        self.assertEqual(biosample.individual_taxon, "Homo sapiens")
        self.assertEqual(biosample.individual_cohort, "covid-19")
        self.assertEqual(biosample.individual_pedigree, "")
        self.assertIsNone(biosample.individual_mother)
        self.assertIsNone(biosample.individual_father)

    def test_no_individual(self):
        biosample_no_individual = Biosample.objects.create(**create_biosample())

        self.assertEqual(biosample_no_individual.alias, "53")
        self.assertEqual(biosample_no_individual.collection_site, "Site1")
        self.assertIsNone(biosample_no_individual.individual)
    
    def test_no_collection_site(self):
        biosample_no_collection_site = Biosample.objects.create(**create_biosample(individual=self.valid_individual, collection_site=None))

        self.assertEqual(biosample_no_collection_site.alias, "53")
        self.assertIsNone(biosample_no_collection_site.collection_site)

    def test_no_alias(self):
        with self.assertRaises(ValidationError):
            try:
                biosample_no_alias = Biosample.objects.create()
            except ValidationError as e:
                self.assertTrue("alias" in e.message_dict)
                raise e
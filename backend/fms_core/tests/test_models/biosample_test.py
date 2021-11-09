from django.test import TestCase

from fms_core.models import Biosample, Individual
from fms_core.tests.constants import create_individual,create_biosample

class BiosampleTest(TestCase):
    """ Test module for Biosample model """

    def setUp(self) -> None:
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))

    def test_biosample(self):
        biosample = Biosample.objects.create(**create_biosample(self.valid_individual))
        self.assertEqual(Biosample.objects.count(), 1)
        self.assertEqual(biosample.alias, "53")
        self.assertEqual(biosample.collection_site, "Site1")
        self.assertEqual(biosample.individual_name, "jdoe")
        self.assertEqual(biosample.individual_sex, Individual.SEX_UNKNOWN)
        self.assertEqual(biosample.individual_taxon, Individual.TAXON_HOMO_SAPIENS)
        self.assertEqual(biosample.individual_cohort, "covid-19")
        self.assertEqual(biosample.individual_pedigree, "")
        self.assertIsNone(biosample.individual_mother)
        self.assertIsNone(biosample.individual_father)
        self.assertEqual(biosample.comment, "")

    def test_no_individual(self):
        biosample_no_individual = Biosample.objects.create(**create_biosample(individual=None, comment="Biosample without individual."))

        self.assertEqual(biosample_no_individual.alias, "53")
        self.assertEqual(biosample_no_individual.collection_site, "Site1")
        self.assertEqual(biosample_no_individual.comment, "Biosample without individual.")
        self.assertIsNone(biosample_no_individual.individual)
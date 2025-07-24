from django.test import TestCase

from fms_core.models import SampleIdentity, Biosample, Individual
from fms_core.tests.constants import create_biosample, create_individual


class SampleIdentityTest(TestCase):
    """ Test module for SampleIdentity model """

    def setUp(self) -> None:
        self.valid_male_individual = Individual.objects.create(**create_individual(individual_name='jdoe', sex=Individual.SEX_MALE))
        self.valid_biosample = Biosample.objects.create(**create_biosample(individual=self.valid_male_individual))

    def test_sampleidentity(self):
        sample_identity = SampleIdentity.objects.create(biosample=self.valid_biosample, conclusive=True, predicted_sex=Individual.SEX_MALE)
        self.assertTrue(sample_identity.conclusive)
        self.assertEqual(sample_identity.predicted_sex, Individual.SEX_MALE)
        self.assertTrue(sample_identity.sex_concordance)
        self.assertEqual(sample_identity.biosample, self.valid_biosample)
        self.assertEqual(sample_identity.identity_matches, [])

    def test_sampleidentity_with_default_conclusive(self):
        sample_identity = SampleIdentity.objects.create(biosample=self.valid_biosample, predicted_sex=Individual.SEX_MALE)
        self.assertFalse(sample_identity.conclusive)
        self.assertEqual(sample_identity.predicted_sex, Individual.SEX_MALE)
        self.assertTrue(sample_identity.sex_concordance)
        self.assertEqual(sample_identity.biosample, self.valid_biosample)
        self.assertEqual(sample_identity.identity_matches, [])

    def test_sampleidentity_with_false_sex_concordance(self):
        sample_identity = SampleIdentity.objects.create(biosample=self.valid_biosample, conclusive=False, predicted_sex=Individual.SEX_FEMALE)
        self.assertFalse(sample_identity.conclusive)
        self.assertEqual(sample_identity.predicted_sex, Individual.SEX_FEMALE)
        self.assertFalse(sample_identity.sex_concordance)
        self.assertEqual(sample_identity.biosample, self.valid_biosample)
        self.assertEqual(sample_identity.identity_matches, [])

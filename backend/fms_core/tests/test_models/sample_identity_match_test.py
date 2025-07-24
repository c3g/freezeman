from django.test import TestCase
from decimal import Decimal
from fms_core.models import SampleIdentity, SampleIdentityMatch, Biosample, Individual
from fms_core.tests.constants import create_biosample, create_individual


class SampleIdentityMatchTest(TestCase):
    """ Test module for SampleIdentityMatch model """

    def setUp(self) -> None:
        self.valid_male_individual = Individual.objects.create(**create_individual(individual_name='jdoe', sex=Individual.SEX_MALE))
        self.valid_biosample_tested = Biosample.objects.create(**create_biosample(individual=self.valid_male_individual))
        self.valid_biosample_matched = Biosample.objects.create(**create_biosample(individual=self.valid_male_individual))
        self.sample_identity_tested = SampleIdentity.objects.create(biosample=self.valid_biosample_tested, conclusive=True, predicted_sex=Individual.SEX_MALE)
        self.sample_identity_matched = SampleIdentity.objects.create(biosample=self.valid_biosample_matched, conclusive=True, predicted_sex=Individual.SEX_MALE)
        self.matching_site_ratio = Decimal("0.92103")
        self.compared_sites = 65

    def test_sampleidentitymatch(self):
        sample_identity_match = SampleIdentityMatch.objects.create(tested=self.sample_identity_tested,
                                                                   matched=self.sample_identity_matched,
                                                                   matching_site_ratio=self.matching_site_ratio,
                                                                   compared_sites=self.compared_sites)
        self.assertEqual(self.sample_identity_tested.identity_matches.count(), 1)
        self.assertEqual(sample_identity_match.matching_site_ratio, self.matching_site_ratio)
        self.assertEqual(sample_identity_match.compared_sites, self.compared_sites)
        self.assertEqual(self.sample_identity_tested.identity_matches.first(), sample_identity_match)

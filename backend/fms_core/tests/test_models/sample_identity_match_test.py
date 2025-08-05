from django.test import TestCase
from django.core.exceptions import ValidationError

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
        self.assertEqual(self.sample_identity_tested.identity_matches.first(), self.sample_identity_matched)

    def test_sampleidentitymatch_mirrored(self):
        sample_identity_match_forward = SampleIdentityMatch.objects.create(tested=self.sample_identity_tested,
                                                                           matched=self.sample_identity_matched,
                                                                           matching_site_ratio=self.matching_site_ratio,
                                                                           compared_sites=self.compared_sites)
        sample_identity_match_reversed = SampleIdentityMatch.objects.create(tested=self.sample_identity_matched,
                                                                            matched=self.sample_identity_tested,
                                                                            matching_site_ratio=self.matching_site_ratio,
                                                                            compared_sites=self.compared_sites)
        self.assertEqual(self.sample_identity_tested.identity_matches.count(), 1)
        self.assertEqual(self.sample_identity_matched.identity_matches.count(), 1)
        self.assertEqual(sample_identity_match_forward.matching_site_ratio, self.matching_site_ratio)
        self.assertEqual(sample_identity_match_forward.compared_sites, self.compared_sites)
        self.assertEqual(sample_identity_match_reversed.matching_site_ratio, self.matching_site_ratio)
        self.assertEqual(sample_identity_match_reversed.compared_sites, self.compared_sites)
        self.assertEqual(self.sample_identity_tested.identity_matches.first(), self.sample_identity_matched)
        self.assertEqual(self.sample_identity_matched.identity_matches.first(), self.sample_identity_tested)

    def test_sampleidentitymatch_missing_compared_sites(self):  
        with self.assertRaises(ValidationError):
            try:
                _ = SampleIdentityMatch.objects.create(tested=self.sample_identity_tested,
                                                       matched=self.sample_identity_matched,
                                                       matching_site_ratio=self.matching_site_ratio)
            except ValidationError as e:
                self.assertTrue("compared_sites" in e.message_dict)
                raise e

    def test_sampleidentitymatch_missing_matching_site_ratio(self):  
        with self.assertRaises(ValidationError):
            try:
                _ = SampleIdentityMatch.objects.create(tested=self.sample_identity_tested,
                                                       matched=self.sample_identity_matched,
                                                       compared_sites=self.compared_sites)
            except ValidationError as e:
                self.assertTrue("matching_site_ratio" in e.message_dict)
                raise e
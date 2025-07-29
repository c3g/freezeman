from decimal import Decimal
from django.test import TestCase

from fms_core.models import Container, SampleKind
from fms_core.models._constants import SEX_MALE, SEX_FEMALE

from fms_core.services.sample_identity import create_sample_identity, create_sample_identity_matches
from fms_core.services.individual import get_or_create_individual, get_taxon
from fms_core.services.sample import create_full_sample

class SampleIdentityServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        test_container = Container.objects.create(barcode="BarbatestTube",
                                                  name="BarbatestTube",
                                                  kind="tube")
        test_match_container = Container.objects.create(barcode="BarbaMatchTube",
                                                        name="BarbaMatchTube",
                                                        kind="tube")

        sample_kind_DNA = SampleKind.objects.get(name="DNA")
        taxon, _, _ = get_taxon(name="Homo sapiens")
        self.individual, _, _, _ = get_or_create_individual(name="BobLaBine",
                                                            alias="TiBob",
                                                            sex=SEX_MALE,
                                                            taxon=taxon)

        self.full_sample, _, _ = create_full_sample(name="SampleForIdentityTesting",
                                                    individual=self.individual,
                                                    volume=20,
                                                    container=test_container,
                                                    sample_kind=sample_kind_DNA,
                                                    creation_date="2024-11-30")
        self.full_matching_sample, _, _ = create_full_sample(name="SampleForIdentityMatching",
                                                             individual=self.individual,
                                                             volume=20,
                                                             container=test_match_container,
                                                             sample_kind=sample_kind_DNA,
                                                             creation_date="2024-11-30")
        
        self.match_dictionary = { self.full_matching_sample.derived_sample_not_pool.biosample.id: {"matching_site_ratio": Decimal("0.66666"), "compared_sites": 63} }

    def test_create_sample_identity(self):
        sample_identity, kept_existing_identity, errors, warnings = create_sample_identity(biosample_id=self.full_sample.derived_sample_not_pool.biosample.id,
                                                                                           conclusive=False,
                                                                                           predicted_sex=SEX_MALE,
                                                                                           replace=False)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertFalse(sample_identity.conclusive)
        self.assertEqual(sample_identity.predicted_sex, SEX_MALE)
        self.assertEqual(sample_identity.biosample.alias, "SampleForIdentityTesting")
        self.assertTrue(sample_identity.sex_concordance)
        self.assertFalse(kept_existing_identity)

    def test_create_sample_identity_matches(self):
        sample_identity_tested, _, _, _ = create_sample_identity(biosample_id=self.full_sample.derived_sample_not_pool.biosample.id,
                                                                 conclusive=False,
                                                                 predicted_sex=SEX_MALE,
                                                                 replace=False)
        sample_identity_matched, _, _, _ = create_sample_identity(biosample_id=self.full_matching_sample.derived_sample_not_pool.biosample.id,
                                                                  conclusive=True,
                                                                  predicted_sex=SEX_MALE,
                                                                  replace=False)
        errors, warnings = create_sample_identity_matches(tested_identity=sample_identity_tested, matches_by_biosample_id=self.match_dictionary)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(sample_identity_tested.identity_matches.count(), 1)
        self.assertEqual(sample_identity_tested.tested_identity_match.first().matching_site_ratio, Decimal("0.66666"))
        self.assertEqual(sample_identity_tested.tested_identity_match.first().compared_sites, 63)
        self.assertEqual(sample_identity_matched.identity_matches.count(), 1)
        self.assertEqual(sample_identity_matched.tested_identity_match.first().matching_site_ratio, Decimal("0.66666"))
        self.assertEqual(sample_identity_matched.tested_identity_match.first().compared_sites, 63)


    def test_create_sample_identity_overwrite_inconclusive(self):
        sample_identity_tested, _, _, _ = create_sample_identity(biosample_id=self.full_sample.derived_sample_not_pool.biosample.id,
                                                                 conclusive=False,
                                                                 predicted_sex=SEX_MALE,
                                                                 replace=False)
        sample_identity_matched, _, _, _ = create_sample_identity(biosample_id=self.full_matching_sample.derived_sample_not_pool.biosample.id,
                                                                  conclusive=True,
                                                                  predicted_sex=SEX_MALE,
                                                                  replace=False)
        errors, warnings = create_sample_identity_matches(tested_identity=sample_identity_tested, matches_by_biosample_id=self.match_dictionary)

        self.assertEqual(sample_identity_tested.identity_matches.count(), 1)
        self.assertEqual(sample_identity_matched.identity_matches.count(), 1)

        sample_identity_tested_replacement, kept_existing_identity, errors, warnings = create_sample_identity(biosample_id=self.full_sample.derived_sample_not_pool.biosample.id,
                                                                                                              conclusive=True,
                                                                                                              predicted_sex=SEX_FEMALE,
                                                                                                              replace=False)

        self.assertEqual(errors, [])
        self.assertEqual(len(warnings), 2)
        self.assertTrue("Predicted sex changed from" in warnings[0])
        self.assertTrue("Conclusive identity changed from" in warnings[1])
        self.assertFalse(sample_identity_tested.conclusive)
        self.assertEqual(sample_identity_tested.predicted_sex, SEX_MALE)
        self.assertEqual(sample_identity_tested.biosample.alias, "SampleForIdentityTesting")
        self.assertTrue(sample_identity_tested.sex_concordance)

        self.assertTrue(sample_identity_tested_replacement.conclusive)
        self.assertEqual(sample_identity_tested_replacement.predicted_sex, SEX_FEMALE)
        self.assertEqual(sample_identity_tested_replacement.biosample.alias, "SampleForIdentityTesting")
        self.assertFalse(sample_identity_tested_replacement.sex_concordance)
        self.assertFalse(kept_existing_identity)

        self.assertEqual(sample_identity_tested.identity_matches.count(), 0)
        self.assertEqual(sample_identity_matched.identity_matches.count(), 0)
        self.assertEqual(sample_identity_tested_replacement.identity_matches.count(), 0)

    def test_create_sample_identity_overwrite_conclusive(self):
        sample_identity_tested, _, _, _ = create_sample_identity(biosample_id=self.full_sample.derived_sample_not_pool.biosample.id,
                                                                 conclusive=True,
                                                                 predicted_sex=SEX_MALE,
                                                                 replace=False)
        sample_identity_matched, _, _, _ = create_sample_identity(biosample_id=self.full_matching_sample.derived_sample_not_pool.biosample.id,
                                                                  conclusive=True,
                                                                  predicted_sex=SEX_MALE,
                                                                  replace=False)
        errors, warnings = create_sample_identity_matches(tested_identity=sample_identity_tested, matches_by_biosample_id=self.match_dictionary)

        self.assertEqual(sample_identity_tested.identity_matches.count(), 1)
        self.assertEqual(sample_identity_matched.identity_matches.count(), 1)

        sample_identity_tested_replacement, kept_existing_identity, errors, warnings = create_sample_identity(biosample_id=self.full_sample.derived_sample_not_pool.biosample.id,
                                                                                                              conclusive=True,
                                                                                                              predicted_sex=SEX_FEMALE,
                                                                                                              replace=False)

        self.assertTrue("Identity difference for biosample ID" in errors[0])
        self.assertTrue("Submitting new Identity for existing conclusive identity for biosample ID" in warnings[0])
        self.assertTrue(sample_identity_tested.conclusive)
        self.assertEqual(sample_identity_tested.predicted_sex, SEX_MALE)
        self.assertEqual(sample_identity_tested.biosample.alias, "SampleForIdentityTesting")
        self.assertTrue(sample_identity_tested.sex_concordance)

        self.assertTrue(sample_identity_tested_replacement, sample_identity_tested)
        self.assertTrue(kept_existing_identity)

        self.assertEqual(sample_identity_tested.identity_matches.count(), 1)
        self.assertEqual(sample_identity_matched.identity_matches.count(), 1)
        self.assertEqual(sample_identity_tested_replacement.identity_matches.count(), 1)
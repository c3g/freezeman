from decimal import Decimal
from django.test import TestCase

from fms_core.models import Container, SampleKind, SampleIdentity
from fms_core.models._constants import SEX_MALE, SEX_FEMALE, SEX_UNKNOWN

from fms_core.services.sample_identity import create_sample_identity, create_sample_identity_matches, ingest_identity_testing_report
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

        self.sample_kind_DNA = SampleKind.objects.get(name="DNA")
        self.taxon, _, _ = get_taxon(name="Homo sapiens")
        self.individual, _, _, _ = get_or_create_individual(name="BobLaBine",
                                                            alias="TiBob",
                                                            sex=SEX_MALE,
                                                            taxon=self.taxon)

        self.full_sample, _, _ = create_full_sample(name="SampleForIdentityTesting",
                                                    individual=self.individual,
                                                    volume=20,
                                                    container=test_container,
                                                    sample_kind=self.sample_kind_DNA,
                                                    creation_date="2024-11-30")
        self.full_matching_sample, _, _ = create_full_sample(name="SampleForIdentityMatching",
                                                             individual=self.individual,
                                                             volume=20,
                                                             container=test_match_container,
                                                             sample_kind=self.sample_kind_DNA,
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
    
    def test_ingest_identity_testing_report(self):
        test_plate_container = Container.objects.create(barcode="PlateWithMoreSamples",
                                                        name="PlateWithMoreSamples",
                                                        kind="96-well plate")

        self.roger, _, _, _ = get_or_create_individual(name="Roger",
                                                       alias="Rodj",
                                                       sex=SEX_MALE,
                                                       taxon=self.taxon)
        self.manon, _, _, _ = get_or_create_individual(name="Manon",
                                                       alias="Coucou",
                                                       sex=SEX_FEMALE,
                                                       taxon=self.taxon)
        self.enrique, _, _, _ = get_or_create_individual(name="Enrique",
                                                         alias="Kike",
                                                         sex=SEX_MALE,
                                                         taxon=self.taxon)

        self.roger_sample, _, _ = create_full_sample(name="SampleFromRoger",
                                                     individual=self.enrique,
                                                     volume=20,
                                                     container=test_plate_container,
                                                     coordinates="A01",
                                                     sample_kind=self.sample_kind_DNA,
                                                     creation_date="2024-11-30")
        self.manon_sample, _, _ = create_full_sample(name="SampleFromManon",
                                                     individual=self.manon,
                                                     volume=20,
                                                     container=test_plate_container,
                                                     coordinates="B01",
                                                     sample_kind=self.sample_kind_DNA,
                                                     creation_date="2024-11-30")
        self.enrique_sample, _, _ = create_full_sample(name="SampleFromEnrique",
                                                       individual=self.enrique,
                                                       volume=20,
                                                       container=test_plate_container,
                                                       coordinates="C01",
                                                       sample_kind=self.sample_kind_DNA,
                                                       creation_date="2024-11-30")
        
        sample_1_biosample_id = str(self.full_sample.derived_sample_not_pool.biosample.id)
        sample_2_biosample_id = str(self.roger_sample.derived_sample_not_pool.biosample.id)
        sample_3_biosample_id = str(self.manon_sample.derived_sample_not_pool.biosample.id)
        sample_4_biosample_id = str(self.full_matching_sample.derived_sample_not_pool.biosample.id)
        sample_5_biosample_id = str(self.enrique_sample.derived_sample_not_pool.biosample.id)

        create_sample_identity(biosample_id=self.enrique_sample.derived_sample_not_pool.biosample.id,
                               conclusive=True,
                               predicted_sex=SEX_FEMALE,
                               replace=False)

        test_report_json = {
            "barcode": "1383082111",
            "instrument": "fluidigm",
            "samples": {
                "SampleForIdentityTesting_" + sample_1_biosample_id: {
                    "sample_name": "SampleForIdentityTesting",
                    "biosample_id": sample_1_biosample_id,
                    "sample_position": "1",
                    "passed": True,
                    "fluidigm_predicted_sex": "male",
                    "genotype_matches": {
                        "1383082111_SampleForIdentityMatching_" + sample_4_biosample_id: {
                          "sample_name": "SampleForIdentityMatching",
                          "biosample_id": sample_4_biosample_id,
                          "plate_barcode": "1383082111",
                          "percent_match": 84.123,
                          "n_sites": 30
                        }
                    }
                },
                "SampleFromRoger_" + sample_2_biosample_id: {
                    "sample_name": "SampleFromRoger",
                    "biosample_id": sample_2_biosample_id,
                    "sample_position": "2",
                    "passed": True,
                    "fluidigm_predicted_sex": "inconclusive",
                    "genotype_matches": None
                },
                "SampleFromManon_" + sample_3_biosample_id: {
                    "sample_name": "SampleFromManon",
                    "biosample_id": sample_3_biosample_id,
                    "sample_position": "3",
                    "passed": False,
                    "fluidigm_predicted_sex": "female",
                    "genotype_matches": None
                },
                "SampleForIdentityMatching_" + sample_4_biosample_id: {
                    "sample_name": "SampleForIdentityMatching",
                    "biosample_id": sample_4_biosample_id,
                    "sample_position": "4",
                    "passed": True,
                    "fluidigm_predicted_sex": "male",
                    "genotype_matches": {
                        "1383082111_SampleForIdentityTesting_" + sample_1_biosample_id: {
                          "sample_name": "SampleForIdentityTesting",
                          "biosample_id": sample_1_biosample_id,
                          "plate_barcode": "1383082111",
                          "percent_match": 84.123,
                          "n_sites": 30
                        }
                    }
                },
                "SampleFromEnrique_" + sample_5_biosample_id: {
                    "sample_name": "SampleFromEnrique",
                    "biosample_id": sample_5_biosample_id,
                    "sample_position": "5",
                    "passed": True,
                    "fluidigm_predicted_sex": "male",
                    "genotype_matches": None
                }
            }
        }

        identities_dict, errors, warnings = ingest_identity_testing_report(report_json=test_report_json, replace=True)

        # Validation
        self.assertEqual(errors, [])
        self.assertEqual(len(warnings), 2)
        self.assertTrue("Predicted sex changed from" in warnings[0])
        self.assertTrue("Identity matches between identity" in warnings[1])

        identity_for_sample_1 = SampleIdentity.objects.get(biosample_id=int(sample_1_biosample_id))
        returned_identity_for_sample_1 = identities_dict[int(sample_1_biosample_id)]
        self.assertEqual(identity_for_sample_1, returned_identity_for_sample_1)
        self.assertTrue(identity_for_sample_1.conclusive)
        self.assertEqual(identity_for_sample_1.predicted_sex, SEX_MALE)
        self.assertTrue(identity_for_sample_1.sex_concordance)
        self.assertEqual(identity_for_sample_1.biosample.alias, "SampleForIdentityTesting")
        self.assertEqual(identity_for_sample_1.identity_matches.count(), 1)

        identity_for_sample_2 = SampleIdentity.objects.get(biosample_id=int(sample_2_biosample_id))
        returned_identity_for_sample_2 = identities_dict[int(sample_2_biosample_id)]
        self.assertEqual(identity_for_sample_2, returned_identity_for_sample_2)
        self.assertTrue(identity_for_sample_2.conclusive)
        self.assertEqual(identity_for_sample_2.predicted_sex, SEX_UNKNOWN)
        self.assertIsNone(identity_for_sample_2.sex_concordance)
        self.assertEqual(identity_for_sample_2.biosample.alias, "SampleFromRoger")
        self.assertEqual(identity_for_sample_2.identity_matches.count(), 0)

        identity_for_sample_3 = SampleIdentity.objects.get(biosample_id=int(sample_3_biosample_id))
        returned_identity_for_sample_3 = identities_dict[int(sample_3_biosample_id)]
        self.assertEqual(identity_for_sample_3, returned_identity_for_sample_3)
        self.assertFalse(identity_for_sample_3.conclusive)
        self.assertEqual(identity_for_sample_3.predicted_sex, SEX_FEMALE)
        self.assertTrue(identity_for_sample_3.sex_concordance)
        self.assertEqual(identity_for_sample_3.biosample.alias, "SampleFromManon")
        self.assertEqual(identity_for_sample_3.identity_matches.count(), 0)

        identity_for_sample_4 = SampleIdentity.objects.get(biosample_id=int(sample_4_biosample_id))
        returned_identity_for_sample_4 = identities_dict[int(sample_4_biosample_id)]
        self.assertEqual(identity_for_sample_4, returned_identity_for_sample_4)
        self.assertTrue(identity_for_sample_4.conclusive)
        self.assertEqual(identity_for_sample_4.predicted_sex, SEX_MALE)
        self.assertTrue(identity_for_sample_4.sex_concordance)
        self.assertEqual(identity_for_sample_4.biosample.alias, "SampleForIdentityMatching")
        self.assertEqual(identity_for_sample_4.identity_matches.count(), 1)

        identity_for_sample_5 = SampleIdentity.objects.get(biosample_id=int(sample_5_biosample_id))
        returned_identity_for_sample_5 = identities_dict[int(sample_5_biosample_id)]
        self.assertEqual(identity_for_sample_5, returned_identity_for_sample_5)
        self.assertTrue(identity_for_sample_5.conclusive)
        self.assertEqual(identity_for_sample_5.predicted_sex, SEX_MALE)
        self.assertTrue(identity_for_sample_5.sex_concordance)
        self.assertEqual(identity_for_sample_5.biosample.alias, "SampleFromEnrique")
        self.assertEqual(identity_for_sample_5.identity_matches.count(), 0)


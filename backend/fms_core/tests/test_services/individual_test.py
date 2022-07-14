from django.test import TestCase

from fms_core.services.individual import get_taxon

class IndividualServicesTestCase(TestCase):

    def test_get_taxon(self):
        HOMO_SAPIENS_NAME = 'Homo sapiens'
        HOMO_SAPIENS_NON_NORMALIZED_NAME = 'HOMO SAPIENS'
        HOMO_SAPIENS_NCBI_ID = 9606

        # Check with normalized name
        taxon, _, _ = get_taxon(name=HOMO_SAPIENS_NAME)
        self.assertIsNotNone(taxon)
        self.assertEqual(taxon.ncbi_id, HOMO_SAPIENS_NCBI_ID)

        # Check with non-normalized name
        taxon, _, _ = get_taxon(name=HOMO_SAPIENS_NON_NORMALIZED_NAME)
        self.assertIsNotNone(taxon)
        self.assertEqual(taxon.ncbi_id, HOMO_SAPIENS_NCBI_ID)

        # Check with ncbi_id
        taxon, _, _ = get_taxon(ncbi_id = 9606)
        self.assertIsNotNone(taxon)
        self.assertEqual(taxon.ncbi_id, HOMO_SAPIENS_NCBI_ID)
        self.assertEqual(taxon.name, HOMO_SAPIENS_NAME)

    def test_get_taxon_invalid(self):

        # Error: both name and ncbi id are None
        taxon, errors, warnings = get_taxon()
        self.assertIsNone(taxon)
        self.assertTrue(len(errors) > 0)

        # Error: taxon doesn't exist
        taxon, errors, warnings = get_taxon(name='Not a valid taxon name')
        self.assertIsNone(taxon)
        self.assertTrue(len(errors) > 0)
        self.assertTrue('No taxon identified' in errors[0])
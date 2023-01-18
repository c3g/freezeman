from django.test import TestCase

from fms_core.services.individual import get_taxon, get_reference_genome, get_or_create_individual

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

    def test_get_reference_genome(self):
        TEST_GENOME = "GRCh38.p14"

        reference_genome, _, _ = get_reference_genome(assembly_name=TEST_GENOME)
        self.assertIsNotNone(reference_genome)
        self.assertEqual(reference_genome.assembly_name, TEST_GENOME)

    def test_get_or_create_individual_creation(self):
        HOMO_SAPIENS_NAME = 'Homo sapiens'
        TEST_GENOME = "GRCh38.p14"
        
        taxon, _, _ = get_taxon(name=HOMO_SAPIENS_NAME)
        reference_genome, _, _ = get_reference_genome(assembly_name=TEST_GENOME)
        individual, created, errors, warnings = get_or_create_individual(name="BobLeBricoleur",
                                                                   alias="sj1",
                                                                   sex="M",
                                                                   taxon=taxon,
                                                                   pedigree="BobLeBricoleur",
                                                                   cohort="BOBS",
                                                                   reference_genome=reference_genome)
        self.assertIsNotNone(individual)
        self.assertTrue(created)
        self.assertIsNone(errors)
        self.assertIsNone(warnings)
        self.assertEqual(individual.reference_genome.assembly_name, TEST_GENOME)
        self.assertEqual(individual.taxon.name, HOMO_SAPIENS_NAME)

    def test_get_or_create_individual_get(self):
        HOMO_SAPIENS_NAME = 'Homo sapiens'
        TEST_GENOME = "GRCh38.p14"
        
        taxon, _, _ = get_taxon(name=HOMO_SAPIENS_NAME)
        reference_genome, _, _ = get_reference_genome(assembly_name=TEST_GENOME)
        _, _, _, _ = get_or_create_individual(name="BobLeBricoleur",
                                              alias="sj1",
                                              sex="M",
                                              taxon=taxon,
                                              pedigree="BobLeBricoleur",
                                              cohort="BOBS",
                                              reference_genome=reference_genome)

        individual, created, errors, warnings = get_or_create_individual(name="BobLeBricoleur",
                                                                         alias="sj1",
                                                                         sex="M",
                                                                         taxon=taxon,
                                                                         pedigree="BobLeBricoleur",
                                                                         cohort="BOBS",
                                                                         reference_genome=reference_genome)
                                                                  
        self.assertIsNotNone(individual)
        self.assertFalse(created)
        self.assertIsNone(errors)
        self.assertIsNone(warnings)
        self.assertEqual(individual.reference_genome.assembly_name, TEST_GENOME)
        self.assertEqual(individual.taxon.name, HOMO_SAPIENS_NAME)

    def test_get_or_create_individual_invalid(self):
        HOMO_SAPIENS_NAME = 'Homo sapiens'
        TEST_GENOME = "GRCh38.p14"
        
        taxon, _, _ = get_taxon(name=HOMO_SAPIENS_NAME)
        reference_genome, _, _ = get_reference_genome(assembly_name=TEST_GENOME)
        _, _, _, _ = get_or_create_individual(name="BobLeBricoleur",
                                              alias="sj1",
                                              sex="M",
                                              taxon=taxon,
                                              pedigree="BobLeBricoleur",
                                              cohort="BOBS",
                                              reference_genome=reference_genome)

        individual, created, errors, warnings = get_or_create_individual(name="BobLeBricoleur",
                                                                         alias="sj1",
                                                                         sex="F",
                                                                         taxon=taxon,
                                                                         pedigree="BobLeBricoleur",
                                                                         cohort="BOBS",
                                                                         reference_genome=reference_genome)
        self.assertIsNone(individual)
        self.assertFalse(created)
        self.assertTrue('Provided sex' in errors[0])
        self.assertIsNone(warnings)
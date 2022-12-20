from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import ReferenceGenome, Taxon


class ReferenceGenomeTest(TestCase):
    def setUp(self):
        self.taxon = Taxon.objects.get_or_create(name="Homo sapiens", ncbi_id=9606)
        self.assembly_name_new = "TestAssembly"
        self.assembly_name_existing = "GRCh38.p14"
        self.synonym = "MyAssembly"
        self.genbank_id = "ThisIsAFake"

    def test_create_reference_genome(self):
        reference_genome = ReferenceGenome.objects.create(assembly_name=self.assembly_name_new,
                                                          synonym=self.synonym,
                                                          genbank_id=self.genbank_id,
                                                          refseq_id=None,
                                                          taxon=self.taxon,
                                                          size=1000)
        self.assertEqual(reference_genome.assembly_name, self.assembly_name_new)

    def test_get_reference_genome(self):
        reference_genome = ReferenceGenome.objects.get(assembly_name=self.assembly_name_existing)
        self.assertEqual(reference_genome.synonym, "hg38")

    def test_no_taxon(self):
        with self.assertRaises(ValidationError):
            try:
                ReferenceGenome.objects.create(assembly_name=self.assembly_name_new,
                                               synonym=self.synonym,
                                               genbank_id=self.genbank_id,
                                               refseq_id=None,
                                               taxon=None,
                                               size=1000)
            except ValidationError as e:
                self.assertTrue("taxon" in e.message_dict)
                raise e

    def test_existing_assembly_name(self):
        with self.assertRaises(ValidationError):
            try:
                ReferenceGenome.objects.create(assembly_name=self.assembly_name_existing,
                                               synonym=self.synonym,
                                               genbank_id=self.genbank_id,
                                               refseq_id=None,
                                               taxon=None,
                                               size=1000)
            except ValidationError as e:
                self.assertTrue("assembly_name" in e.message_dict)
                raise e
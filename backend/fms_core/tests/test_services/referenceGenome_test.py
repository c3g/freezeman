from django.test import TestCase

from fms_core.services.referenceGenome import can_edit_referenceGenome
from fms_core.models import Individual, ReferenceGenome, Taxon

class ReferenceGenomeServicesTestCase(TestCase):
    def setUp(self) -> None:
        taxon = Taxon.objects.get(name="Homo sapiens")
        ReferenceGenome.objects.create(
            assembly_name="101",
            taxon=taxon,
            size=1101
        )
        ReferenceGenome.objects.create(
            assembly_name="102",
            taxon=taxon,
            size=1102
        )
        self.refGenome_101 = ReferenceGenome.objects.get(assembly_name="101")
        self.refGenome_102 = ReferenceGenome.objects.get(assembly_name="102")

        Individual.objects.create(
            name="test_indivdual",
            reference_genome=self.refGenome_101,
            taxon=taxon,
            sex='F'
        )
    # testing to see which refGenomes can be edited if assigned to an individual
    def test_get_editable(self):
        # one refGenomes is assigned to an individual, other is not
        # verify editable boolean is correct for each taxon
        edit_101 = can_edit_referenceGenome(self.refGenome_101.id)
        edit_102 = can_edit_referenceGenome(self.refGenome_102.id)

        self.assertTrue(edit_101)
        self.assertTrue(edit_102)
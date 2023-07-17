from django.test import TestCase

from fms_core.services.referenceGenome import can_edit_referenceGenome
from fms_core.models import Individual, ReferenceGenome, Taxon

class ReferenceGenomeServicesTestCase(TestCase):
    # testing to see which refGenomes can be edited if assigned to an individual
    def test_get_editable(self):
        taxon = Taxon.objects.get(name="Homo sapiens")
        refGenome_101 = ReferenceGenome.objects.create(
            assembly_name="test_referenceGenome_not_editable",
            taxon=taxon,
            size=1101
        )
        refGenome_102 = ReferenceGenome.objects.create(
            assembly_name="test_referenceGenome",
            taxon=taxon,
            size=1102
        )
        Individual.objects.create(
            name="test_indivdual",
            referenceGenome=refGenome_101
        )
        # one refGenomes is assigned to an individual, other is not
        # verify editable boolean is correct for each taxon
        edit_101 = can_edit_referenceGenome(refGenome_101)
        edit_102 = can_edit_referenceGenome(refGenome_102)

        self.assertTrue(not edit_101)
        self.assertTrue(edit_102)
from django.test import TestCase

from fms_core.services.taxon import can_edit_taxon
from fms_core.models import Taxon, Individual

class TaxonServicesTestCase(TestCase):
    def setUp(self) -> None:
        Taxon.objects.create(
            name="101",
            ncbi_id=101
        )
        Taxon.objects.create(
            name="102",
            ncbi_id=102
        )
        self.taxon_101 = Taxon.objects.get(name="101")
        self.taxon_102 = Taxon.objects.get(name="102")
        Individual.objects.create(
            name="test_indivdual",
            taxon=self.taxon_101,
            sex='F'
        )
    # testing to see which taxons can be edited if assigned to an individual
    def test_get_editable(self):
        
        # one taxon is assigned to an individual, other is not
        # verify editable boolean is correct for each taxon
        edit_101 = can_edit_taxon(self.taxon_101.id)
        edit_102 = can_edit_taxon(self.taxon_102.id)

        self.assertFalse(edit_101)
        self.assertTrue(edit_102)
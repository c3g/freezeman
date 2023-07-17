from django.test import TestCase
from fms_core.models import Taxon, Individual

from fms_core.services.taxon import can_edit_taxon

class TaxonServicesTestCase(TestCase):
    # testing to see which taxons can be edited if assigned to an individual
    def test_get_editable(self):
        taxon_101 = Taxon.objects.create(
            name="test_taxon_not_editable",
            ncbi_id=101
        )
        taxon_102 = Taxon.objects.create(
            name="test_taxon",
            ncbi_id=102
        )
        Individual.objects.create(
            name="test_indivdual",
            taxon=taxon_101
        )
        # one taxon is assigned to an individual, other is not
        # verify editable boolean is correct for each taxon
        edit_101 = can_edit_taxon(taxon_101)
        edit_102 = can_edit_taxon(taxon_102)

        self.assertTrue(not edit_101)
        self.assertTrue(edit_102)
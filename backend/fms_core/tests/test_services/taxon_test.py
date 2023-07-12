from django.test import TestCase

from fms_core.services.taxon import can_edit_taxon

class TaxonServicesTestCase(TestCase):
    def setup(self) -> None:
        ex = 1
    def test_get_individual(self):
        editable = can_edit_taxon()
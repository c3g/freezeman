from django.test import TestCase

from fms_core.services.referenceGenome import can_edit_referenceGenome

class ReferenceGenomeServicesTestCase(TestCase):
    def setup(self) -> None:
        ex = 1
    def test_get_individual(self):
        editable = can_edit_referenceGenome()
from django.test import TestCase
from fms_core.prefilling_functions import get_axiom_experiment_barcode_from_comment
from fms_core.template_importer._constants import DESTINATION_CONTAINER_BARCODE_MARKER

class PrefillFunctionsTestCase(TestCase):
    def test_get_axiom_experiment_barcode_from_comment(self):
        expected_barcode = "YabaDaBadouuuuuu"
        suffix = " ."
        comment = f"I took my dog out today and i got... Then {DESTINATION_CONTAINER_BARCODE_MARKER}i ate --- Äppflesauce! If{DESTINATION_CONTAINER_BARCODE_MARKER}{expected_barcode}{suffix} The next Day (2024-02-12) i will return for fooz. 33 more{DESTINATION_CONTAINER_BARCODE_MARKER}"
        barcode = get_axiom_experiment_barcode_from_comment(comment)
        self.assertEqual(barcode, expected_barcode)

from django.test import TestCase

from ..utils import check_truth_like, normalize_scientific_name


class AdminUtilsTestCase(TestCase):
    def setUp(self) -> None:
        pass

    def test_check_truth_like(self):
        self.assertEqual(check_truth_like("true"), True)
        self.assertEqual(check_truth_like("True"), True)
        self.assertEqual(check_truth_like("TRUE"), True)
        self.assertEqual(check_truth_like("t"), True)
        self.assertEqual(check_truth_like("T"), True)
        self.assertEqual(check_truth_like("yes"), True)
        self.assertEqual(check_truth_like("yeS"), True)
        self.assertEqual(check_truth_like("Yes"), True)
        self.assertEqual(check_truth_like("Y"), True)

        self.assertEqual(check_truth_like("No"), False)
        self.assertEqual(check_truth_like("N"), False)
        self.assertEqual(check_truth_like(""), False)
        self.assertEqual(check_truth_like("NO"), False)
        self.assertEqual(check_truth_like("False"), False)
        self.assertEqual(check_truth_like("false"), False)
        self.assertEqual(check_truth_like("FALSE"), False)

    def test_normalize_scientific_name(self):
        self.assertEqual(normalize_scientific_name("homo sapiens"), "Homo sapiens")
        self.assertEqual(normalize_scientific_name("Homo Sapiens"), "Homo sapiens")
        self.assertEqual(normalize_scientific_name("HOMO SAPIENS SAPIENS"), "Homo sapiens sapiens")

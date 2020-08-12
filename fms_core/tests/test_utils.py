from django.test import TestCase

from ..utils import (
    blank_str_to_none,
    VolumeHistoryUpdateType,
    create_volume_history,
    check_truth_like,
    normalize_scientific_name,
    str_normalize,
    str_cast_and_normalize,
    get_normalized_str,
)


class AdminUtilsTestCase(TestCase):
    def setUp(self) -> None:
        pass

    def test_blank_str_to_none(self):
        self.assertIs(blank_str_to_none(""), None)
        self.assertIs(blank_str_to_none(None), None)
        self.assertEqual(blank_str_to_none(" "), " ")
        self.assertEqual(blank_str_to_none(5), 5)
        self.assertEqual(blank_str_to_none(" 5"), " 5")

    def test_create_volume_history(self):
        with self.assertRaises(AssertionError):
            # noinspection PyTypeChecker
            create_volume_history("fake", "10")
        with self.assertRaises(ValueError):
            create_volume_history(VolumeHistoryUpdateType.EXTRACTION, "10")
        with self.assertRaises(ValueError):
            create_volume_history(VolumeHistoryUpdateType.EXTRACTION, "10", None)
        with self.assertRaises(ValueError):
            # noinspection PyTypeChecker
            create_volume_history(VolumeHistoryUpdateType.EXTRACTION, "10", "a")

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

        self.assertEqual(check_truth_like("animal"), False)

    def test_normalize_scientific_name(self):
        self.assertEqual(normalize_scientific_name("homo sapiens"), "Homo sapiens")
        self.assertEqual(normalize_scientific_name("Homo Sapiens"), "Homo sapiens")
        self.assertEqual(normalize_scientific_name("HOMO SAPIENS SAPIENS"), "Homo sapiens sapiens")

    def test_str_normalize(self):
        self.assertEqual(str_normalize("  \u0065\u0301 "), "\u00e9")

    def test_str_cast_and_normalize(self):
        self.assertEqual(str_cast_and_normalize(5), "5")

    def test_get_normalized_str(self):
        self.assertEqual(get_normalized_str({"test": 5}, "test"), "5")
        self.assertEqual(get_normalized_str({"test": None}, "test", default="aa"), "aa")

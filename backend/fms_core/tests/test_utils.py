from django.test import TestCase
import pytest

from ..utils import (
    blank_str_to_none,
    check_truth_like,
    normalize_scientific_name,
    str_normalize,
    str_cast_and_normalize,
    get_normalized_str,
    fit_string_with_ellipsis_in_middle,
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

FIT_STRING = "Hello World!!!"
FIT_ELLIPSIS = "..."

@pytest.mark.parametrize("max_length, ellipsis, error", [
    (-1, FIT_ELLIPSIS, "The max_length (-1) must be greater than 0."),
    (0,  FIT_ELLIPSIS, "The max_length (0) must be greater than 0."),
    (2,  FIT_ELLIPSIS, f"The max_length (2) is too short for the ellipsis '{FIT_ELLIPSIS}'."),
    (3,  FIT_ELLIPSIS, f"The max_length (3) is too short for the ellipsis '{FIT_ELLIPSIS}'."),
])
def test_fit_string_with_ellipsis_in_middle_errors(max_length, ellipsis, error):
    with pytest.raises(Exception) as excinfo:
        fit_string_with_ellipsis_in_middle("", max_length, ellipsis)
    assert str(excinfo.value) == error

@pytest.mark.parametrize("string, max_length, ellipsis, expected", [
    (FIT_STRING, len(FIT_STRING) + 1,  FIT_ELLIPSIS, FIT_STRING),
    (FIT_STRING, len(FIT_STRING) + 0,  FIT_ELLIPSIS, FIT_STRING),
    (FIT_STRING, len(FIT_STRING) - 1,  FIT_ELLIPSIS, "Hello...ld!!!"),
    (FIT_STRING, len(FIT_STRING) - 2,  FIT_ELLIPSIS, "Hello...d!!!"),
    (FIT_STRING, len(FIT_STRING) - 3,  FIT_ELLIPSIS, "Hell...d!!!"),
    (FIT_STRING, len(FIT_STRING) - 4,  FIT_ELLIPSIS, "Hell...!!!"),
    (FIT_STRING, len(FIT_STRING) - 5,  FIT_ELLIPSIS, "Hel...!!!"),
    (FIT_STRING, len(FIT_STRING) - 6,  FIT_ELLIPSIS, "Hel...!!"),
    (FIT_STRING, len(FIT_STRING) - 7,  FIT_ELLIPSIS, "He...!!"),
    (FIT_STRING, len(FIT_STRING) - 8,  FIT_ELLIPSIS, "He...!"),
    (FIT_STRING, len(FIT_STRING) - 9,  FIT_ELLIPSIS, "H...!"),
    (FIT_STRING, len(FIT_STRING) - 10, FIT_ELLIPSIS, "H..."),
])
def test_fit_string_with_ellipsis_in_middle(string, max_length, ellipsis, expected):
    assert fit_string_with_ellipsis_in_middle(string, max_length, ellipsis) == expected

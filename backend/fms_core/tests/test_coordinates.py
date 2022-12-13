from django.test import TestCase
from ..coordinates import CoordinateError, alphas, convert_alpha_digit_coord_to_ordinal, ints, validate_and_normalize_coordinates


class CoordinateTestCase(TestCase):
    def test_alphas(self):
        a = alphas(26)
        self.assertEqual(len(a), 26)
        self.assertIn("A", a)
        self.assertIn("Z", a)

    def test_alphas_errors(self):
        with self.assertRaises(ValueError):
            alphas(27)

        with self.assertRaises(ValueError):
            alphas(-1)

    def test_ints(self):
        i = ints(100)
        self.assertEqual(len(i), 100)
        self.assertIn("1", i)
        self.assertIn("100", i)

    def test_ints_padded(self):
        i = ints(100, pad_to=5)
        self.assertEqual(len(i), 100)
        self.assertIn("00001", i)
        self.assertNotIn("1", i)
        self.assertNotIn("01", i)
        self.assertIn("00100", i)
        self.assertNotIn("0100", i)

    def test_ints_errors(self):
        with self.assertRaises(ValueError):
            ints(-1)

    def test_empty_coords(self):
        cs = ()
        self.assertEqual(validate_and_normalize_coordinates("", cs), "")
        self.assertEqual(validate_and_normalize_coordinates("  ", cs), "")

        for iv in ("A1", "1 ", " Z"):
            with self.assertRaises(CoordinateError):
                validate_and_normalize_coordinates(iv, cs)

    def test_alpha_coords(self):
        cs = (alphas(10),)
        self.assertEqual(validate_and_normalize_coordinates(" A", cs), "A")
        self.assertEqual(validate_and_normalize_coordinates("J ", cs), "J")

        for iv in (" K", "1 ", "  "):
            with self.assertRaises(CoordinateError):
                validate_and_normalize_coordinates(iv, cs)

    def test_int_coords(self):
        cs = (ints(10),)
        self.assertEqual(validate_and_normalize_coordinates("1 ", cs), "1")
        self.assertEqual(validate_and_normalize_coordinates("10", cs), "10")

        for iv in ("11", "-1", "B ", "CC", "  "):
            with self.assertRaises(CoordinateError):
                validate_and_normalize_coordinates(iv, cs)

    def test_2d_coords_a1(self):
        cs = (alphas(8), ints(12))
        self.assertEqual(validate_and_normalize_coordinates(" A1 ", cs), "A1")
        self.assertEqual(validate_and_normalize_coordinates(" H12", cs), "H12")

        for iv in ("1A", "I12", "A13", "CC", "231", "  "):
            with self.assertRaises(CoordinateError):
                validate_and_normalize_coordinates(iv, cs)

    def test_alpha_digit_ordinal(self):
        cs = (alphas(2), ints(10))

        self.assertEqual(convert_alpha_digit_coord_to_ordinal("A01", cs), 1)
        self.assertEqual(convert_alpha_digit_coord_to_ordinal("A02", cs), 2)
        self.assertEqual(convert_alpha_digit_coord_to_ordinal("A10", cs), 10)

        self.assertEqual(convert_alpha_digit_coord_to_ordinal("B01", cs), 11)
        self.assertEqual(convert_alpha_digit_coord_to_ordinal("B02", cs), 12)
        self.assertEqual(convert_alpha_digit_coord_to_ordinal("B10", cs), 20)

        for invalid in ("", "A", "0", "AA", "00", "A9B"):
            with self.assertRaises(CoordinateError):
                convert_alpha_digit_coord_to_ordinal(invalid, cs)
        
        
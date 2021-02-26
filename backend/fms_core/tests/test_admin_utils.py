from django.test import TestCase

# noinspection PyProtectedMember
from ..utils_admin import padded_nones


class AdminUtilsTestCase(TestCase):
    def setUp(self) -> None:
        pass

    def test_padded_nones(self):
        self.assertEqual([1], padded_nones([1], -10))
        self.assertEqual([1], padded_nones([1], 0))
        self.assertEqual([1], padded_nones([1], 0))
        self.assertEqual([1, None], padded_nones([1], 2))

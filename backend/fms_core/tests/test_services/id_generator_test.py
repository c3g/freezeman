from django.test import TestCase

from fms_core.services.id_generator import get_unique_id

class IdGeneratorServicesTestCase(TestCase):

    def test_get_unique_id(self):

        start = get_unique_id() # depends on the the order the test are run

        one = get_unique_id()
        self.assertEqual(one, start + 1)

        two = get_unique_id()
        self.assertEqual(two, start + 2)

        three = get_unique_id()
        self.assertEqual(three, start + 3)
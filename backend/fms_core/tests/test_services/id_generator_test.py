from django.test import TestCase

from fms_core.services.id_generator import get_unique_id

class IdGeneratorServicesTestCase(TestCase):

    def test_get_unique_id(self):
        """
          Test assume 2 ids were generated during the model tests
        """
        THREE = 3
        FOUR = 4
        FIVE = 5

        three = get_unique_id()
        self.assertEqual(three, THREE)

        four = get_unique_id()
        self.assertEqual(four, FOUR)

        five = get_unique_id()
        self.assertEqual(five, FIVE)
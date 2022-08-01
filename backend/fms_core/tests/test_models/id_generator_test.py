from django.test import TestCase

from fms_core.models import IdGenerator

class IdGeneratorTest(TestCase):
    """ Test module for IdGenerator model """

    def setUp(self) -> None:
        pass
      
    def test_biosample(self):
        generator = IdGenerator.objects.create()
        self.assertEqual(IdGenerator.objects.count(), 1)
        self.assertEqual(generator.id, 1)

        generator = IdGenerator.objects.create()
        self.assertEqual(IdGenerator.objects.count(), 2)
        self.assertEqual(generator.id, 2)

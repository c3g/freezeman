from decimal import Decimal
from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.containers import NON_SAMPLE_CONTAINER_KINDS
from fms_core.models import Container, Sample

from fms_core.tests.constants import create_container, create_sample, create_sample_container


class SampleTest(TestCase):
    """ Test module for Sample model """

    def setUp(self) -> None:
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
        self.wrong_container = Container.objects.create(**create_container(barcode='R123456'))

    def test_sample(self):
        sample = Sample.objects.create(**create_sample(container=self.valid_container, comment="This is a sample."))
        self.assertEqual(Sample.objects.count(), 1)
        self.assertEqual(sample.is_depleted, "no")
        self.assertEqual(sample.volume, Decimal("5000.000"))
        self.assertEqual(sample.container_kind, "tube")
        self.assertEqual(sample.container_name, "TestTube01")
        self.assertIsNone(sample.container_location)
        self.assertIsNone(sample.context_sensitive_coordinates)
        self.assertIsNone(sample.source_depleted)  # Source depleted is invalid here - not an extracted sample
        self.assertEqual(sample.comment, "This is a sample.")

    def test_plates_with_coordinates(self):
        # sample can be in plates and tube only
        for i, container_kind in enumerate(('96-well plate', '384-well plate')):
            plate_container = Container.objects.create(**create_sample_container(container_kind,
                                                                                 name=f'Test_name_{i}',
                                                                                 barcode=f'Barcode_{i}'))
            sample_in_plate_container = Sample(**create_sample(container=plate_container, coordinates="A11"))
            sample_in_plate_container.full_clean()
            sample_in_plate_container.save()

            with self.assertRaises(ValidationError):
                try:
                    # Should not be able to create a sample in the same place
                    Sample.objects.create(**create_sample(container=plate_container, coordinates="A11", name="test_sample_02"))
                except ValidationError as e:
                    self.assertIn("coordinate", e.message_dict)
                    raise e

        self.assertEqual(Sample.objects.count(), 2)

    def test_wrong_container_kind(self):
        # sample cannot be in containers of those types
        for i, container_kind in enumerate(NON_SAMPLE_CONTAINER_KINDS):
            invalid_container_kind = Container.objects.create(**create_sample_container(container_kind,
                                                                                        name=f'Test_name_{i}',
                                                                                        barcode=f'Barcode_{i}'))
            sample_in_invalid_container_kind = Sample(**create_sample(container=invalid_container_kind))
            self.assertRaises(ValidationError, sample_in_invalid_container_kind.full_clean)

    def test_no_volume_depletion(self):
        sample = Sample.objects.create(**create_sample(volume=0, container=self.valid_container, comment="This is a sample."))
        self.assertEqual(Sample.objects.count(), 1)
        self.assertEqual(sample.is_depleted, "yes")
        self.assertEqual(sample.volume, Decimal("0"))
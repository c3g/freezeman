from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.test import TestCase

from fms_core.models import Container
from fms_core.tests.constants import create_container


class ContainerTest(TestCase):
    """ Test module for Container model """

    def setUp(self):
        pass

    def test_container(self):
        Container.objects.create(**create_container(barcode='R123456'))
        created_valid_container = Container.objects.get(name='TestRack001')
        self.assertEqual(created_valid_container.barcode, 'R123456')

    def test_invalid_barcode_space(self):
        with self.assertRaises(ValidationError):
            try:
                # Test space in barcode
                Container.objects.create(**create_container(barcode='R 123456'))
            except ValidationError as e:
                self.assertIn("barcode", e.message_dict)
                raise e

    def test_invalid_barcode_tab(self):
        with self.assertRaises(ValidationError):
            try:
                # Test tab in barcode
                Container.objects.create(**create_container(barcode='R\t23456'))
            except ValidationError as e:
                self.assertIn("barcode", e.message_dict)
                raise e

    def test_invalid_barcode_newline(self):
        with self.assertRaises(ValidationError):
            try:
                # Test newline in barcode
                Container.objects.create(**create_container(barcode='R\n23456'))
            except ValidationError as e:
                self.assertIn("barcode", e.message_dict)
                raise e

    def test_same_coordinates(self):
        rack = Container.objects.create(**create_container(barcode='R123456'))
        Container.objects.create(**create_container(location=rack, barcode='R123457', coordinates="A01", kind="tube",
                                                    name="tube01"))
        with self.assertRaises(ValidationError):
            try:
                Container.objects.create(**create_container(location=rack, barcode='R123458', coordinates="A01",
                                                            kind="tube", name="tube02"))
            except ValidationError as e:
                self.assertIn("coordinate", e.message_dict)
                raise e

    def test_non_existent_parent(self):
        with self.assertRaises(ObjectDoesNotExist):
            Container.objects.create(**create_container(
                barcode='R123456',
                location=Container.objects.get(barcode='RandomNonExistentBarcode')
            ))

    def test_coordinates_without_location(self):
        with self.assertRaises(ValidationError):
            try:
                c = create_container(barcode="Barcode001", coordinates="A01")
                Container.objects.create(**c)
            except ValidationError as e:
                self.assertIn("coordinate", e.message_dict)
                raise e

    def test_invalid_parent_coordinates(self):
        parent_container = Container.objects.create(**create_container(barcode='ParentBarcode01'))
        with self.assertRaises(ValidationError):
            Container.objects.create(**create_container(
                barcode="Barcode002",
                location=parent_container,
                coordinates="Z22",
                kind="tube",
            ))

    def test_location_equal_barcode(self):
        parent_container = Container.objects.create(**create_container(barcode='ParentBarcode01'))
        invalid_container = Container(**create_container(barcode='ParentBarcode01',
                                                         location=parent_container))
        self.assertRaises(ValidationError, invalid_container.full_clean)

    def test_container_hierarchy(self):
        # create parent container tube rack, tube rack can only have a tube inside
        parent_container = Container.objects.create(
            kind='Tube Rack 8x12',
            name='ParentRack001',
            barcode='ParentBarcode01'
        )
        # also tube rack kind - tube rack cannot contain tube rack
        valid_container = Container(**create_container(barcode='R123456', location=parent_container))
        with self.assertRaises(ValidationError):
            valid_container.full_clean()
        self.assertEqual(Container.objects.count(), 1)
        self.assertEqual(Container.objects.all()[0].barcode, 'ParentBarcode01')

    # coordinates tested in a separate file
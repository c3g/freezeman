from django.test import TestCase
from ..models import *
from . constants import *
from django.core.exceptions import ObjectDoesNotExist, ValidationError


class ContainerTest(TestCase):
    """ Test module for Container model """

    def setUp(self):
        pass

    def test_container(self):
        Container.objects.create(**container(barcode='R123456'))
        created_valid_container = Container.objects.get(name='TestRack001')
        self.assertEqual(created_valid_container.barcode, 'R123456')

    def test_non_existent_parent(self):
        try:
            Container.objects.create(**container(barcode='R123456',
                                                 location=Container.objects.get(barcode='RandomNonExistentBarcode')))
        except Container.DoesNotExist:
            self.assertRaises(ObjectDoesNotExist)

    def test_location_equal_barcode(self):
        parent_container = Container.objects.create(**container(barcode='ParentBarcode01'))
        invalid_container = Container(**container(barcode='ParentBarcode01',
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
        valid_container = Container(**container(barcode='R123456', location=parent_container))
        try:
            valid_container.full_clean()
        except Exception:
            self.assertRaises(ValidationError)
        self.assertEqual(Container.objects.count(), 1)
        self.assertEqual(Container.objects.all()[0].barcode, 'ParentBarcode01')

    # coordinates tested in a separate file

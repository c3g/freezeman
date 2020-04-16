from django.test import TestCase
from ..models import *
from .constants import *
from django.core.exceptions import ObjectDoesNotExist, ValidationError


class ContainerTest(TestCase):
    """ Test module for Container model """

    def setUp(self):
        pass

    def test_container(self):
        Container.objects.create(**create_container(barcode='R123456'))
        created_valid_container = Container.objects.get(name='TestRack001')
        self.assertEqual(created_valid_container.barcode, 'R123456')

    def test_non_existent_parent(self):
        try:
            Container.objects.create(**create_container(barcode='R123456',
                                                 location=Container.objects.get(barcode='RandomNonExistentBarcode')))
        except Container.DoesNotExist:
            self.assertRaises(ObjectDoesNotExist)

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
        try:
            valid_container.full_clean()
        except Exception:
            self.assertRaises(ValidationError)
        self.assertEqual(Container.objects.count(), 1)
        self.assertEqual(Container.objects.all()[0].barcode, 'ParentBarcode01')

    # coordinates tested in a separate file

class SampleTest(TestCase):
    """ Test module for Sample model """

    def setUp(self) -> None:
        self.valid_individual = Individual.objects.create(**create_individual(name='jdoe'))
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01',
                                                                           barcode='T123456'))
        self.wrong_container = Container.objects.create(**create_container(barcode='R123456'))

    def test_sample(self):
        Sample.objects.create(**create_sample(self.valid_individual, self.valid_container))
        self.assertEqual(Sample.objects.count(), 1)

    def test_plates_with_coordinates(self):
        for i, container_kind in enumerate(['96-well plate', '384-well plate']):
            plate_container = Container.objects.create(**create_sample_container(container_kind,
                    name='Test_name_'+ str(i),
                    barcode='Barcode_'+ str(i)))
            sample_in_plate_container = Sample(**create_sample(self.valid_individual, plate_container,
                                                               coordinates='A11'))
            sample_in_plate_container.save()
        self.assertEqual(Sample.objects.count(), 2)

    def test_wrong_container_kind(self):
        for i, container_kind in enumerate(['box', 'room', 'freezer', 'freezer rack', 'drawer',
                                            'tube rack 8x12', 'tube box 10x10', 'tube box 9x9']):
            invalid_container_kind = Container.objects.create(**create_sample_container(container_kind,
                                                                          name='Test_name_' + str(i),
                                                                          barcode='Barcode_' + str(i)))
            sample_in_invalid_container_kind = Sample(**create_sample(self.valid_individual,
                                                                      invalid_container_kind))
            self.assertRaises(ValidationError, sample_in_invalid_container_kind.full_clean)

from django.core.exceptions import NON_FIELD_ERRORS
class ExtractedSampleTest(TestCase):

    def setUp(self) -> None:
        # tube rack 8x12
        self.parent_tube_rack = Container.objects.create(**create_container(barcode='R123456'))
        # tube
        self.tube_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01',
                                                                                 barcode='T123456',
                                                                                 location=self.parent_tube_rack,
                                                                                 coordinates='C3'))
        ####### parent sample data ########
        # individual
        self.valid_individual = Individual.objects.create(**create_individual(name='jdoe'))
        # parent sample container
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube02',
                                                                                  barcode='TParent01'))
        # create parent sample
        self.parent_sample = Sample.objects.create(**create_sample(self.valid_individual,
                                                                   self.valid_container))
        self.constants = dict(individual=self.valid_individual, container=self.tube_container,
                              extracted_from=self.parent_sample)

    def test_extracted_sample(self):
        s = Sample.objects.create(**create_extracted_sample(biospecimen_type='DNA', volume_used=Decimal('0.01'),
                                                            **self.constants))
        print(s.__dict__)
        self.assertEqual(Sample.objects.count(), 2)

    def test_validation(self):
        invalid_biospecimen = Sample(**create_extracted_sample(biospecimen_type='BLOOD', volume_used=Decimal('0.01'),
                                                               **self.constants))
        try:
            invalid_biospecimen.full_clean()
        except ValidationError as e:
            self.assertTrue('biospecimen_type' in e.message_dict)

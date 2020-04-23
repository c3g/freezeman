from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.test import TestCase
from ..containers import NON_SAMPLE_CONTAINER_KINDS
from ..models import *
from .constants import *


class ContainerTest(TestCase):
    """ Test module for Container model """

    def setUp(self):
        pass

    def test_container(self):
        Container.objects.create(**create_container(barcode='R123456'))
        created_valid_container = Container.objects.get(name='TestRack001')
        self.assertEqual(created_valid_container.barcode, 'R123456')

    def test_non_existent_parent(self):
        with self.assertRaises(ObjectDoesNotExist):
            Container.objects.create(**create_container(
                barcode='R123456',
                location=Container.objects.get(barcode='RandomNonExistentBarcode')
            ))

    def test_coordinates_without_location(self):
        with self.assertRaises(ValidationError):
            c = create_container(barcode="Barcode001")
            c["coordinates"] = "A01"
            Container.objects.create(**c)

    def test_invalid_parent_coordiantes(self):
        parent_container = Container.objects.create(**create_container(barcode='ParentBarcode01'))
        with self.assertRaises(ValidationError):
            Container.objects.create(**create_container(
                barcode="Barcode002",
                location=parent_container,
                coordinates="Z99",
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


class SampleTest(TestCase):
    """ Test module for Sample model """

    def setUp(self) -> None:
        self.valid_individual = Individual.objects.create(**create_individual(name='jdoe'))
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01',
                                                                                  barcode='T123456'))
        self.wrong_container = Container.objects.create(**create_container(barcode='R123456'))

    def test_sample(self):
        sample = Sample.objects.create(**create_sample(self.valid_individual, self.valid_container))
        self.assertEqual(Sample.objects.count(), 1)
        self.assertEqual(sample.is_depleted, "no")
        self.assertEqual(sample.volume, Decimal("5000.000"))
        self.assertEqual(sample.individual_name, "jdoe")
        self.assertEqual(sample.individual_sex, Individual.SEX_UNKNOWN)
        self.assertEqual(sample.individual_taxon, Individual.TAXON_HOMO_SAPIENS)
        self.assertEqual(sample.individual_cohort, "covid-19")
        self.assertEqual(sample.individual_pedigree, "")

    def test_plates_with_coordinates(self):
        # sample can be in plates and tube only
        for i, container_kind in enumerate(['96-well plate', '384-well plate']):
            plate_container = Container.objects.create(**create_sample_container(container_kind,
                                                                                 name=f'Test_name_{i}',
                                                                                 barcode=f'Barcode_{i}'))
            sample_in_plate_container = Sample(**create_sample(self.valid_individual, plate_container,
                                                               coordinates='A11'))
            sample_in_plate_container.full_clean()
            sample_in_plate_container.save()
        self.assertEqual(Sample.objects.count(), 2)

    def test_wrong_container_kind(self):
        # sample cannot be in containers of those types
        for i, container_kind in enumerate(NON_SAMPLE_CONTAINER_KINDS):
            invalid_container_kind = Container.objects.create(**create_sample_container(container_kind,
                                                                                        name=f'Test_name_{i}',
                                                                                        barcode=f'Barcode_{i}'))
            sample_in_invalid_container_kind = Sample(**create_sample(self.valid_individual,
                                                                      invalid_container_kind))
            self.assertRaises(ValidationError, sample_in_invalid_container_kind.full_clean)


class ExtractedSampleTest(TestCase):

    def setUp(self) -> None:
        # tube rack 8x12
        self.parent_tube_rack = Container.objects.create(**create_container(barcode='R123456'))
        # tube
        self.tube_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01',
                                                                                 barcode='T123456',
                                                                                 location=self.parent_tube_rack,
                                                                                 coordinates='C03'))
        # ====== parent sample data ======
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
        Sample.objects.create(**create_extracted_sample(biospecimen_type='DNA', volume_used=Decimal('0.01'),
                                                        **self.constants))
        self.assertEqual(Sample.objects.count(), 2)

    def test_biospecimen_type(self):
        # extracted sample can be only of type DNA or RNA
        invalid_biospecimen = Sample(**create_extracted_sample(biospecimen_type='BLOOD', volume_used=Decimal('0.01'),
                                                               **self.constants))
        try:
            invalid_biospecimen.full_clean()
        except ValidationError as e:
            self.assertTrue('biospecimen_type' in e.message_dict)

    def test_volume_used(self):
        # volume_used cannot be None for an extracted_sample
        invalid_volume_used = Sample(**create_extracted_sample(biospecimen_type='DNA', volume_used=None,
                                                               **self.constants))
        try:
            invalid_volume_used.full_clean()
        except ValidationError as e:
            self.assertTrue('volume_used' in e.message_dict)

        # the volume_used is not allowed with non-extracted sample + this container already has a sample inside
        invalid_volume_used = Sample(**create_sample(self.valid_individual, self.valid_container,
                                                     volume_used=Decimal('0.01')))
        try:
            invalid_volume_used.full_clean()
        except ValidationError as e:
            for error in ('volume_used', 'container'):
                self.assertTrue(error in e.message_dict.keys())

    def test_concentration(self):
        # for DNA or RNA samples concentration cannot be None
        invalid_concentration = Sample(**create_extracted_sample(biospecimen_type='DNA', volume_used=Decimal('0.01'),
                                                                 **self.constants))
        invalid_concentration.concentration = None
        self.assertRaises(ValidationError, invalid_concentration.full_clean)
        self.assertEqual(Sample.objects.count(), 1)

    def test_tissue_source(self):
        # tissue_source can only be specified for DNA and RNA
        invalid_tissue_source = Sample(**create_sample(self.valid_individual, self.tube_container,
                                                       tissue_source='Blood'))
        try:
            invalid_tissue_source.full_clean()
        except ValidationError as e:
            self.assertTrue('tissue_source' in e.message_dict)


class IndividualTest(TestCase):

    def setUp(self) -> None:
        pass

    def test_individual(self):
        individual = Individual.objects.create(**create_individual(name="jdoe"))
        self.assertEqual(Individual.objects.count(), 1)
        self.assertEqual(str(individual), "jdoe")

    def test_mother_father(self):
        # individual name can't be mother name and can't be father name
        mother = Individual.objects.create(**create_individual(name='janedoe'))
        father = Individual.objects.create(**create_individual(name='johndoe'))
        individual = Individual(**create_individual(name='janedoe', mother=mother))
        try:
            individual.full_clean()
        except ValidationError as e:
            self.assertTrue('mother' in e.message_dict)
        individual = Individual(**create_individual(name='johndoe', father=father))
        try:
            individual.full_clean()
        except ValidationError as e:
            self.assertTrue('father' in e.message_dict)
        # mother and father can't be the same individual
        individual = Individual(**create_individual(name='jdoe', mother=mother, father=mother))
        try:
            individual.full_clean()
        except ValidationError as e:
            for mf in ('mother', 'father'):
                self.assertTrue(mf in e.message_dict.keys())

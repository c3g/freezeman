from django.core.exceptions import ValidationError
from django.test import TestCase
from fms_core.models import Individual
from fms_core.tests.constants import create_individual

class IndividualTest(TestCase):
    def test_individual(self):
        individual = Individual.objects.create(**create_individual(individual_name="jdoe"))
        self.assertEqual(Individual.objects.count(), 1)
        self.assertEqual(str(individual), "jdoe")

    def test_mother_father(self):
        # individual id can't be mother id and can't be father id
        mother = Individual.objects.create(**create_individual(individual_name='janedoe'))
        father = Individual.objects.create(**create_individual(individual_name='johndoe'))
        individual = Individual(**create_individual(individual_name='janedoe', mother=mother))

        with self.assertRaises(ValidationError):
            try:
                individual.full_clean()
            except ValidationError as e:
                self.assertIn('name', e.message_dict)
                raise e

        individual = Individual(**create_individual(individual_name='johndoe', father=father))

        with self.assertRaises(ValidationError):
            try:
                individual.full_clean()
            except ValidationError as e:
                self.assertIn('name', e.message_dict)
                raise e

        # mother and father can't be the same individual
        individual = Individual(**create_individual(individual_name='jdoe', mother=mother, father=mother))

        with self.assertRaises(ValidationError):
            try:
                individual.full_clean()
            except ValidationError as e:
                for mf in ('mother', 'father'):
                    self.assertIn(mf, e.message_dict)
                raise e

    def test_pedigree(self):
        # pedigree must match for trio
        mother = Individual.objects.create(**create_individual(individual_name='janedoe', pedigree='p1'))
        father = Individual.objects.create(**create_individual(individual_name='johndoe', pedigree='p1'))

        with self.assertRaises(ValidationError):
            try:
                Individual.objects.create(**create_individual(individual_name='jimdoe', mother=mother, father=father,
                                                              pedigree='p2'))
            except ValidationError as e:
                self.assertIn("pedigree", e.message_dict)
                raise e

    def test_generic_individual(self):
        generic_individual = Individual.objects.create(**create_individual(individual_name="GENERIC_joeblo", is_generic=True))
        self.assertEqual(Individual.objects.count(), 1)
        self.assertEqual(str(generic_individual), "GENERIC_joeblo")
        self.assertTrue(generic_individual.is_generic)
        individual = Individual.objects.create(**create_individual(individual_name="GEN_joeblo", is_generic=False))
        self.assertEqual(Individual.objects.count(), 2)
        self.assertEqual(str(individual), "GEN_joeblo")
        self.assertFalse(individual.is_generic)

    def test_creating_generic_individual_without_flag(self):
        with self.assertRaises(ValidationError):
            try:
                Individual.objects.create(**create_individual(individual_name="GENERIC_joeblo"))
            except ValidationError as e:
                self.assertIn("is_generic", e.message_dict)
                raise e
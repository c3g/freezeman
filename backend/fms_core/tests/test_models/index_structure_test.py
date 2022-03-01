from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import IndexStructure, Sequence


class IndexStructureTest(TestCase):
    def setUp(self):
        self.flanker_5prime_forward, _ = Sequence.objects.get_or_create(value="ACGTTCCCG")
        self.flanker_5prime_reverse, _ = Sequence.objects.get_or_create(value="ACGTTCCCG")
        self.flanker_3prime_forward, _ = Sequence.objects.get_or_create(value="GTTTAACTAG")
        self.flanker_3prime_reverse, _ = Sequence.objects.get_or_create(value="TGTTTCACCTGGG")

        self.name = "ThisIsValidStructureName"

        #for duplicate test
        self.duplicate_name = self.name

        #for similar name test
        self.similar_name = "thisisvalidstructurename"


    def test_index_structure(self):
        my_index_structure = IndexStructure.objects.create(name=self.name,
                                                           flanker_3prime_forward=self.flanker_3prime_forward,
                                                           flanker_3prime_reverse=self.flanker_3prime_reverse,
                                                           flanker_5prime_forward=self.flanker_5prime_forward,
                                                           flanker_5prime_reverse=self.flanker_5prime_reverse)

        self.assertEqual(my_index_structure.name, self.name)
        self.assertEqual(my_index_structure.flanker_3prime_forward, self.flanker_3prime_forward)
        self.assertEqual(my_index_structure.flanker_3prime_reverse, self.flanker_3prime_reverse)
        self.assertEqual(my_index_structure.flanker_5prime_forward, self.flanker_5prime_forward)
        self.assertEqual(my_index_structure.flanker_5prime_reverse, self.flanker_5prime_reverse)

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                index_structure_without_name = IndexStructure.objects.create(flanker_3prime_forward=self.flanker_3prime_forward,
                                                                             flanker_3prime_reverse=self.flanker_3prime_reverse,
                                                                             flanker_5prime_forward=self.flanker_5prime_forward,
                                                                             flanker_5prime_reverse=self.flanker_5prime_reverse)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_missing_flanker(self):
        with self.assertRaises(ValidationError):
            try:
                index_structure_missing_flanker = IndexStructure.objects.create(name=self.name,
                                                                                flanker_3prime_forward=self.flanker_3prime_forward,
                                                                                flanker_3prime_reverse=self.flanker_3prime_reverse,
                                                                                flanker_5prime_forward=self.flanker_5prime_forward)
                                                                             
            except ValidationError as e:
                self.assertTrue("flanker_5prime_reverse" in e.message_dict)
                raise e

    def test_duplicate_index_structure_with_name(self):
        with self.assertRaises(ValidationError):
            # First IndexStructure is valid
            IndexStructure.objects.create(name=self.name,
                                          flanker_3prime_forward=self.flanker_3prime_forward,
                                          flanker_3prime_reverse=self.flanker_3prime_reverse,
                                          flanker_5prime_forward=self.flanker_5prime_forward,
                                          flanker_5prime_reverse=self.flanker_5prime_reverse)

            try:
                # Second IndexStructure has the same name, should be invalid
                IndexStructure.objects.create(name=self.duplicate_name,
                                              flanker_3prime_forward=self.flanker_3prime_forward,
                                              flanker_3prime_reverse=self.flanker_3prime_reverse,
                                              flanker_5prime_forward=self.flanker_5prime_forward,
                                              flanker_5prime_reverse=self.flanker_5prime_reverse)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_index_structure_with_similar_name(self):
        with self.assertRaises(ValidationError):
            # First IndexStructure is valid
            IndexStructure.objects.create(name=self.name,
                                          flanker_3prime_forward=self.flanker_3prime_forward,
                                          flanker_3prime_reverse=self.flanker_3prime_reverse,
                                          flanker_5prime_forward=self.flanker_5prime_forward,
                                          flanker_5prime_reverse=self.flanker_5prime_reverse)

            try:
                # Second IndexStructure has a similar name, but different upper/lower cases, should be invalid
                IndexStructure.objects.create(name=self.similar_name,
                                              flanker_3prime_forward=self.flanker_3prime_forward,
                                              flanker_3prime_reverse=self.flanker_3prime_reverse,
                                              flanker_5prime_forward=self.flanker_5prime_forward,
                                              flanker_5prime_reverse=self.flanker_5prime_reverse)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e
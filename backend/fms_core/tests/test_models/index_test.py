from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Index, IndexSet, IndexStructure, Sequence


class IndexTest(TestCase):
    def setUp(self):
        self.flanker_5prime_forward, _ = Sequence.objects.get_or_create(value="ACGTTCCCG")
        self.flanker_5prime_reverse, _ = Sequence.objects.get_or_create(value="ACGTTCCCG")
        self.flanker_3prime_forward, _ = Sequence.objects.get_or_create(value="GTTTAACTAG")
        self.flanker_3prime_reverse, _ = Sequence.objects.get_or_create(value="TGTTTCACCTGGG")

        self.sequence_3prime_1, _ = Sequence.objects.get_or_create(value="TGTTGTCGCCGGGA")
        self.sequence_3prime_2, _ = Sequence.objects.get_or_create(value="TGTTGTCGCC")

        self.sequence_5prime_1, _ = Sequence.objects.get_or_create(value="CCATTTGGGGA")
        self.sequence_5prime_2, _ = Sequence.objects.get_or_create(value="TGTCCAAGGCT")

        self.index_set = IndexSet.objects.create(name="ThisIsTestSet")
        self.index_structure = IndexStructure.objects.create(name="ThisIsTestStructure",
                                                             flanker_3prime_forward=self.flanker_3prime_forward,
                                                             flanker_3prime_reverse=self.flanker_3prime_reverse,
                                                             flanker_5prime_forward=self.flanker_5prime_forward,
                                                             flanker_5prime_reverse=self.flanker_5prime_reverse)      

        self.name = "ThisIsValidIndexName"

        #for duplicate test
        self.duplicate_name = self.name

        #for similar name test
        self.similar_name = "thisisvalidindexname"


    def test_index_set(self):
        my_index = Index.objects.create(name=self.name,
                                        index_set=self.index_set,
                                        index_structure=self.index_structure)

        self.assertEqual(my_index.name, self.name)
        self.assertEqual(my_index.index_set, self.index_set)
        self.assertEqual(my_index.index_structure, self.index_structure)
        self.assertEqual(my_index.sequences_3prime.all().count(), 0)
        self.assertEqual(my_index.sequences_5prime.all().count(), 0)

        my_index.sequences_3prime.add(self.sequence_3prime_1)
        self.assertEqual(my_index.sequences_3prime.all().count(), 1)
        my_index.sequences_3prime.add(self.sequence_3prime_2)
        self.assertEqual(my_index.sequences_3prime.all().count(), 2)

        my_index.sequences_5prime.add(self.sequence_5prime_1)
        my_index.sequences_5prime.add(self.sequence_5prime_1)
        self.assertEqual(my_index.sequences_5prime.all().count(), 2)


    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                index_without_name = Index.objects.create(index_set=self.index_set,
                                                                   index_structure=self.index_structure)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_missing_structure(self):
        with self.assertRaises(ValidationError):
            try:
                index_without_structure = Index.objects.create(name=self.name,
                                                                   index_set=self.index_set)
            except ValidationError as e:
                self.assertTrue("index_structure" in e.message_dict)
                raise e

    def test_duplicate_index_with_name(self):
        with self.assertRaises(ValidationError):
            # First Index is valid
            Index.objects.create(name=self.name,
                                 index_set=self.index_set,
                                 index_structure=self.index_structure)
            try:
                # Second Index has the same name, should be invalid
                Index.objects.create(name=self.duplicate_name,
                                     index_set=self.index_set,
                                     index_structure=self.index_structure)

            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_index_set_with_similar_name(self):
        with self.assertRaises(ValidationError):
            # First Index is valid
            Index.objects.create(name=self.name,
                                 index_set=self.index_set,
                                 index_structure=self.index_structure)

            try:
                # Second Index has a similar name, but different upper/lower cases, should be invalid
                Index.objects.create(name=self.similar_name,
                                     index_set=self.index_set,
                                     index_structure=self.index_structure)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e
from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Index, IndexSet, IndexStructure, Sequence, SequenceByIndex5Prime


class SequenceByIndex5PrimeTest(TestCase):
    def setUp(self):
        self.flanker_5prime_forward, _ = Sequence.objects.get_or_create(value="ACGTTCCCG")
        self.flanker_5prime_reverse, _ = Sequence.objects.get_or_create(value="ACGTTCCCG")
        self.flanker_3prime_forward, _ = Sequence.objects.get_or_create(value="GTTTAACTAG")
        self.flanker_3prime_reverse, _ = Sequence.objects.get_or_create(value="TGTTTCACCTGGG")

        self.sequence_5prime_1, _ = Sequence.objects.get_or_create(value="TGTTGTCGCCGGGA")
        self.sequence_5prime_2, _ = Sequence.objects.get_or_create(value="")

        self.index_set = IndexSet.objects.create(name="ThisIsTestSet")
        self.index_structure = IndexStructure.objects.create(name="ThisIsTestStructure",
                                                             flanker_3prime_forward=self.flanker_3prime_forward,
                                                             flanker_3prime_reverse=self.flanker_3prime_reverse,
                                                             flanker_5prime_forward=self.flanker_5prime_forward,
                                                             flanker_5prime_reverse=self.flanker_5prime_reverse)      

        self.name = "ThisIsValidIndexName"

        self.index = Index.objects.create(name=self.name,
                                          index_set=self.index_set,
                                          index_structure=self.index_structure)

    def test_sequence_by_index_5_prime(self):
        SequenceByIndex5Prime.objects.create(index=self.index, sequence=self.sequence_5prime_1)
        self.assertEqual(self.index.sequences_5prime.all().count(), 1)

    def test_empty_sequence(self):
        with self.assertRaises(ValidationError):
            try:
                SequenceByIndex5Prime.objects.create(index=self.index, sequence=self.sequence_5prime_2)
            except ValidationError as e:
                self.assertTrue("sequence" in e.message_dict)
                raise e

    def test_duplicate_index_sequence(self):
        with self.assertRaises(ValidationError):
            # First sequence for Index is valid
            SequenceByIndex5Prime.objects.create(index=self.index, sequence=self.sequence_5prime_1)
            try:
                # Second identical sequence for Index should be invalid
                SequenceByIndex5Prime.objects.create(index=self.index, sequence=self.sequence_5prime_1)

            except ValidationError as e:
                self.assertTrue("sequence" in e.message_dict)
                raise e
from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Index, IndexSet, IndexBySet, IndexStructure, Sequence


class IndexBySetTest(TestCase):
    def setUp(self):
        self.flanker_5prime_forward, _ = Sequence.objects.get_or_create(value="ACGTTCCCG")
        self.flanker_5prime_reverse, _ = Sequence.objects.get_or_create(value="ACGTTCCCG")
        self.flanker_3prime_forward, _ = Sequence.objects.get_or_create(value="GTTTAACTAG")
        self.flanker_3prime_reverse, _ = Sequence.objects.get_or_create(value="TGTTTCACCTGGG")

        self.index_set_1 = IndexSet.objects.create(name="ThisIsTestSet")
        self.index_set_2 = IndexSet.objects.create(name="ThisIsTestSetAlso")
        self.index_structure = IndexStructure.objects.create(name="ThisIsTestStructure",
                                                             flanker_3prime_forward=self.flanker_3prime_forward,
                                                             flanker_3prime_reverse=self.flanker_3prime_reverse,
                                                             flanker_5prime_forward=self.flanker_5prime_forward,
                                                             flanker_5prime_reverse=self.flanker_5prime_reverse)      

        self.index = Index.objects.create(name="ThisIsValidIndexName", index_structure=self.index_structure)

    def test_index_by_set(self):
        index_by_set_1 = IndexBySet.objects.create(index=self.index,index_set=self.index_set_1)

        self.assertEqual(index_by_set_1.index, self.index)
        self.assertEqual(index_by_set_1.index_set, self.index_set_1)
        self.assertEqual(self.index.index_sets.all().count(), 1)

        index_by_set_2 = IndexBySet.objects.create(index=self.index,index_set=self.index_set_2)

        self.assertEqual(index_by_set_2.index, self.index)
        self.assertEqual(index_by_set_2.index_set, self.index_set_2)
        self.assertEqual(self.index.index_sets.all().count(), 2)

    def test_duplicate_index_by_set(self):
        with self.assertRaises(ValidationError):
            # First Index by set is valid
            IndexBySet.objects.create(index=self.index,index_set=self.index_set_1)
            try:
                # Second Index by set already exists
                IndexBySet.objects.create(index=self.index,index_set=self.index_set_1)

            except ValidationError as e:
                self.assertEqual(e.message_dict["__all__"], ["Index by set with this Index and Index set already exists."])
                raise e

from django.test import TestCase

from fms_core.models import IndexStructure, InstrumentType

from fms_core.services.index import (get_or_create_index_set, create_index, get_index, validate_indices, 
                                     create_indices_3prime_by_sequence, create_indices_5prime_by_sequence)

class IndexServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.index_set_name = "NEW_INDEX_SET"

        self.index_name_1 = "TEST_INDEX_1"
        self.index_name_2 = "TEST_INDEX_2"

        self.structure_name = "TruSeqLT"
        self.TruSeqLT_structure = IndexStructure.objects.get(name=self.structure_name)


    def test_get_or_create_index_set(self):
        # Test for creation
        index_set_1, created, errors, warnings = get_or_create_index_set(self.index_set_name)
        self.assertEqual(index_set_1.name, self.index_set_name)
        self.assertTrue(created)
        self.assertFalse(errors)
        self.assertFalse(warnings)

        # Test for getting existing index_set
        index_set_2, created, errors, warnings = get_or_create_index_set(self.index_set_name)
        self.assertEqual(index_set_2.name, self.index_set_name)
        self.assertFalse(created)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_create_index(self):
        # init
        index_set_1, _, _, _ = get_or_create_index_set(self.index_set_name)
        # test
        index_1, errors, warnings = create_index(self.index_name_1, self.structure_name, index_set_1)
        self.assertEqual(index_1.index_structure, self.TruSeqLT_structure)
        self.assertEqual(index_1.index_set, index_set_1)
        self.assertEqual(index_1.name, self.index_name_1)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_get_index(self):
        # init
        index_set_1, _, _, _ = get_or_create_index_set(self.index_set_name)
        index_1, _, _ = create_index(self.index_name_1, self.structure_name, index_set_1)
        # test
        index_2, errors, warnings = get_index(self.index_name_1)
        self.assertEqual(index_1, index_2)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_create_indices_3prime_by_sequence(self):
        # init
        index_set_1, _, _, _ = get_or_create_index_set(self.index_set_name)
        index_1, _, _ = create_index(self.index_name_1, self.structure_name, index_set_1)
        index_2, _, _ = create_index(self.index_name_2, self.structure_name, index_set_1)
        test_single_value = ["CGTTTTATA"]
        test_multi_values = ["AGTCTTTCAG", "AGCCCCCAG", "AGTGGTACAG"] # To test index pool
        # test
        links_3prime_1, errors, warnings = create_indices_3prime_by_sequence(index_1, test_single_value)
        self.assertFalse(errors)
        self.assertFalse(warnings)
        for link in links_3prime_1:
            self.assertEqual(link.index, index_1)
            self.assertIn(link.sequence.value, test_single_value)
        links_3prime_2, errors, warnings = create_indices_3prime_by_sequence(index_2, test_multi_values)
        self.assertFalse(errors)
        self.assertFalse(warnings)
        for link in links_3prime_2:
            self.assertEqual(link.index, index_2)
            self.assertIn(link.sequence.value, test_multi_values)

    def test_create_indices_5prime_by_sequence(self):
        # init
        index_set_1, _, _, _ = get_or_create_index_set(self.index_set_name)
        index_1, _, _ = create_index(self.index_name_1, self.structure_name, index_set_1)
        index_2, _, _ = create_index(self.index_name_2, self.structure_name, index_set_1)
        test_single_value = ["CGTTTTATA"]
        test_multi_values = ["AGTCTTTCAG", "AGCCCCCAG", "AGTGGTACAG"] # To test index pool
        # test
        links_3prime_1, errors, warnings = create_indices_5prime_by_sequence(index_1, test_single_value)
        self.assertFalse(errors)
        self.assertFalse(warnings)
        for link in links_3prime_1:
            self.assertEqual(link.index, index_1)
            self.assertIn(link.sequence.value, test_single_value)
        links_3prime_2, errors, warnings = create_indices_5prime_by_sequence(index_2, test_multi_values)
        self.assertFalse(errors)
        self.assertFalse(warnings)
        for link in links_3prime_2:
            self.assertEqual(link.index, index_2)
            self.assertIn(link.sequence.value, test_multi_values)

    def test_validate_indices(self):
        # init
        INDICES_TO_VALIDATE = [
            (self.index_set_name, self.structure_name, "TEST_INDEX_1", "CCCCCCCCCC", "CCCCCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_2", "CCCCCCCCGG", "CCCCCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_3", "CCCCCCCCCC", "CCCCCCCCTT"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_4", "AACCCCCCCC", "CCCCCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_5", "TTCCCCCCCC", "CCCCCCCCTT"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_6", "GGCCCCCCCC", "CCCCCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_7", "CCCCGGCCCC", "CCCCCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_8", "CCCCTTCCCC", "CCCCCCCCCC"),
        ]
        instrument_type_obj = InstrumentType.objects.get(type="Illumina NovaSeq 6000")
        indices = []
        for index_set_name, index_structure_name, index_name, sequence3prime, sequence5prime in INDICES_TO_VALIDATE:
            index_set_obj, _, _, _ = get_or_create_index_set(index_set_name)
            index_obj, _, _ = create_index(index_name, index_structure_name, index_set_obj)
            create_indices_3prime_by_sequence(index_obj, [sequence3prime])
            create_indices_5prime_by_sequence(index_obj, [sequence5prime])
            indices.append(index_obj)
        # test
        results, errors, warnings = validate_indices(indices=indices,
                                                     instrument_type=instrument_type_obj,
                                                     length_5_prime=10,
                                                     length_3_prime=10,
                                                     threshold=1)
        print(results["distances"])
        print(errors)
        print(warnings)
        self.assertTrue(results["is_valid"])
        self.assertFalse(errors)
        self.assertFalse(warnings)
                         

from django.test import TestCase

from fms_core.models import IndexStructure, InstrumentType

from fms_core.services.index import (get_or_create_index_set, create_index, get_index, validate_indices, validate_distance_matrix,
                                     create_indices_3prime_by_sequence, create_indices_5prime_by_sequence)

class IndexServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.index_set_name = "NEW_INDEX_SET"

        self.index_name_1 = "TEST_INDEX_1"
        self.index_name_2 = "TEST_INDEX_2"

        self.structure_name = "TruSeqLT"
        self.TruSeqLT_structure = IndexStructure.objects.get(name=self.structure_name)

    def test_validate_distance_matrix(self):
        # init
        INDICES_TO_VALIDATE = [
            (self.index_set_name, self.structure_name, "TEST_INDEX_1", "CCCCCCCCCC", "CCCCCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_2", "CCCCCCCCGG", "CCCCCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_3", "CCCCTCGCCC", "CCCCCCCCTT"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_4", "AACCACCCCC", "CCCCCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_5", "TTCCGCCCCC", "CCCCCCCCTT"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_6", "GGCCCCCCCC", "CCTGCCCCCC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_7", "CCCCGGCCCC", "CCCCCCAACC"),
            (self.index_set_name, self.structure_name, "TEST_INDEX_8", "CCCCTTCCCC", "CCCCAAAACC"),
        ]
        instrument_type_obj = InstrumentType.objects.get(type="Illumina NovaSeq 6000")
        indices = []
        for index_set_name, index_structure_name, index_name, sequence3prime, sequence5prime in INDICES_TO_VALIDATE:
            index_set_obj, _, _, _ = get_or_create_index_set(index_set_name)
            index_obj, _, _ = create_index(index_name, index_structure_name, index_set_obj)
            create_indices_3prime_by_sequence(index_obj, [sequence3prime])
            create_indices_5prime_by_sequence(index_obj, [sequence5prime])
            indices.append(index_obj)
        results, errors, warnings = validate_indices(indices=indices,
                                                     instrument_type=instrument_type_obj,
                                                     length_5_prime=10,
                                                     length_3_prime=10,
                                                     threshold=1)
        # test
        is_valid, collision_list = validate_distance_matrix(results["distances"], 0)
        self.assertTrue(is_valid)
        self.assertEqual(collision_list, [])
        is_valid, collision_list = validate_distance_matrix(results["distances"], 2)
        self.assertFalse(is_valid)
        self.assertEqual(collision_list, [(1, 0), (2, 0), (5, 0), (6, 0), (7, 6)])
from django.test import TestCase

from ..coordinates import alphas, ints
from ..containers import CONTAINER_SPEC_96_WELL_PLATE, CONTAINER_SPEC_ROOM


class AdminUtilsTestCase(TestCase):
    def setUp(self) -> None:
        pass

    def test_container_spec(self):
        self.assertEqual(str(CONTAINER_SPEC_96_WELL_PLATE), "96-well plate")
        self.assertDictEqual(CONTAINER_SPEC_96_WELL_PLATE.serialize(), {
            "id": "96-well plate",
            "coordinate_spec": (alphas(8), ints(12, pad_to=2)),
            "coordinate_overlap_allowed": False,
            "children_ids": [],
            "is_source": False,
            "is_run_container": False,
        })

        self.assertTrue(CONTAINER_SPEC_ROOM.is_source)

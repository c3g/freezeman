from django.test import TestCase

from fms_core.template_importer.importers import ContainerCreationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Container, Coordinate


class ContainerCreationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ContainerCreationImporter()
        self.file = APP_DATA_ROOT / "Container_creation_v4_2_0.xlsx"

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        coord_A01 = Coordinate.objects.get(name="A01")

        # Info for confirmation
        containerInfo1 = {"name": "TubeBox_TestCreation", "barcode": "TubeBox_1", "kind": "tube box 7x7"}
        containerInfo2 = {"name": "Room_TestCreation", "barcode": "Room_1", "kind": "room", "comment": "Room where we put stuff"}
        containerInfo3 = {"name": "Freezer_TestCreation", "barcode": "Freezer_1", "kind": "freezer 3 shelves", "location__barcode": "Room_1", "comment": "Cold when it is powered"}
        containerInfo4 = {"name": "TubeRack_TestCreation", "barcode": "TubeRack_1", "kind": "tube rack 8x12", "coordinate": coord_A01, "location__barcode": "Freezer_1"}

        # Verifications
        self.assertTrue(Container.objects.filter(**containerInfo1).exists())
        self.assertTrue(Container.objects.filter(**containerInfo2).exists())
        self.assertTrue(Container.objects.filter(**containerInfo3).exists())
        self.assertTrue(Container.objects.filter(**containerInfo4).exists())



from django.test import TestCase

from fms_core.template_importer.importers import ContainerCreationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Container


class ContainerCreationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ContainerCreationImporter()
        self.file = APP_DATA_ROOT / "Container_creation_v3_5_0.xlsx"

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Info for confirmation
        containerInfo1 = {"name": "TubeBox_TestCreation", "barcode": "TubeBox_1", "kind": "tube box 7x7"}
        containerInfo2 = {"name": "Room_TestCreation", "barcode": "Room_1", "kind": "room"}
        containerInfo3 = {"name": "Freezer_TestCreation", "barcode": "Freezer_1", "kind": "freezer 3 shelves", "location__barcode": "Room_1"}
        containerInfo4 = {"name": "TubeRack_TestCreation", "barcode": "TubeRack_1", "kind": "tube rack 8x12", "coordinates": "A01", "location__barcode": "Freezer_1"}

        # Verifications
        self.assertTrue(Container.objects.filter(**containerInfo1).exists())
        self.assertTrue(Container.objects.filter(**containerInfo2).exists())
        self.assertTrue(Container.objects.filter(**containerInfo3).exists())
        self.assertTrue(Container.objects.filter(**containerInfo4).exists())



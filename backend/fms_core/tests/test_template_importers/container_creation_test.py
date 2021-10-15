from django.test import TestCase

from fms_core.template_importer.importers import ContainerCreationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Container


class ContainerCreationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ContainerCreationImporter()
        self.file = APP_DATA_ROOT / "Container_creation_vtest.xlsx"

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Info for confirmation
        containerInfo1 = {"name": "TubeBox_TestCreation", "barcode": "TubeBox_1", "kind": "tube box 7x7"}
        containerInfo2 = {"name": "Room_TestCreation", "barcode": "Room_1", "kind": "room"}
        containerInfo3 = {"name": "Freezer_TestCreation", "barcode": "Freezer_1", "kind": "freezer 3 shelves"}
        containerInfo4 = {"name": "TubeRack_TestCreation", "barcode": "TubeRack_1", "kind": "tube rack 8x12", "coordinates": "A01"}

        container1 = Container.objects.get(**containerInfo1)
        container2 = Container.objects.get(**containerInfo2)
        container3 = Container.objects.get(**containerInfo3)
        container4 = Container.objects.get(**containerInfo4)

        # Verifications
        self.assertTrue(container1)
        self.assertTrue(container2)
        self.assertTrue(container3)
        self.assertTrue(container3.location == container2)
        self.assertTrue(container4)
        self.assertTrue(container4.location == container3)



from django.test import TestCase

from fms_core.services import container
from fms_core.models import Container

TEST_CONTAINERS = {"BARCODECONTAINER1": {"name":"CONTAINER1", "kind": "freezer rack 7x4", "location": "", "coordinates": ""},
                   "BARCODECONTAINER2": {"name":"CONTAINER2", "kind": "tube rack 8x12", "location": "BARCODECONTAINER1", "coordinates": "A01"},
                   "BARCODECONTAINER3": {"name":"CONTAINER3", "kind": "tube", "location": "BARCODECONTAINER2", "coordinates": "A01"},}
TEST_CONTAINERS_CREATION = {"BARCODECONTAINER4": {"name":"CONTAINER4", "kind": "tube", "location": "", "coordinates": ""},
                            "BARCODECONTAINER5": {"name":"CONTAINER5", "kind": "tube", "location": "BARCODECONTAINER2", "coordinates": "A02"},}

class ContainerServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Initialize test containers
        for barcode, container in TEST_CONTAINERS.items():
            if container["location"]:
                location = Container.objects.get(barcode=container["location"])
            else:
                location = None
            Container.objects.create(barcode=barcode,
                                     name=container["name"],
                                     kind=container["kind"],
                                     location=location,
                                     coordinates=container["coordinates"])        

    def test_get_container(self):
        # Test existing container
        test_barcode = "BARCODECONTAINER1"
        testContainer, error, warning = container.get_container(test_barcode)
        self.assertEqual(testContainer.barcode, test_barcode)
        self.assertEqual(error, [])
        self.assertEqual(warning, [])
        # Test not existing container
        testWrongBarcode, error, warning = container.get_container("NOTABARCODE")
        self.assertEqual(testWrongBarcode, None)
        self.assertEqual(len(error), 1)
        self.assertEqual(warning, [])

    def test_get_or_create_container(self):
        # Test get container
        test_barcode = "BARCODECONTAINER1"
        testContainer, created, error, warning = container.get_or_create_container(test_barcode)
        self.assertEqual(testContainer.barcode, test_barcode)
        self.assertEqual(created, False)
        self.assertEqual(error, [])
        self.assertEqual(warning, [])
        # Test create container
        test_create_barcode = "BARCODECONTAINER4"
        testCreationBarcode1, created, error, warning = container.get_or_create_container(barcode=test_create_barcode,
                                                                                         kind=TEST_CONTAINERS_CREATION[test_create_barcode]["kind"],
                                                                                         name=TEST_CONTAINERS_CREATION[test_create_barcode]["name"],
                                                                                         creation_comment="Test get_or_create")
        self.assertEqual(testCreationBarcode1.barcode, test_create_barcode)
        self.assertEqual(testCreationBarcode1.comment, "Test get_or_create")
        self.assertEqual(created, True)
        self.assertEqual(error, [])
        self.assertEqual(warning, [])
        # Test create container without enough information
        test_create_barcode = "BARCODECONTAINER5"
        location = Container.objects.get(barcode=TEST_CONTAINERS_CREATION[test_create_barcode]["location"])
        testCreationBarcode2, created, error, warning = container.get_or_create_container(barcode=test_create_barcode,
                                                                                         name=TEST_CONTAINERS_CREATION[test_create_barcode]["name"],
                                                                                         coordinates=TEST_CONTAINERS_CREATION[test_create_barcode]["coordinates"],
                                                                                         container_parent=location,
                                                                                         creation_comment="Test get_or_create")
        self.assertEqual(testCreationBarcode2, None)
        self.assertEqual(created, False)
        self.assertEqual(len(error), 1)
        self.assertEqual(warning, [])
        # Test create container with wrong information
        test_create_barcode = "BARCODECONTAINER4"
        wrong_kind = "96-well plate"
        testCreationBarcode3, created, error, warning = container.get_or_create_container(barcode=test_create_barcode,
                                                                                         kind=wrong_kind,
                                                                                         name=TEST_CONTAINERS_CREATION[test_create_barcode]["name"],
                                                                                         creation_comment="Test get_or_create")
        self.assertEqual(testCreationBarcode3, None)
        self.assertEqual(created, False)
        self.assertEqual(len(error), 1)
        self.assertEqual(warning, [])

    def test_create_container(self):
        pass
    
    def test_rename_container(self):
        pass

    def test_move_container(self):
        pass
from django.test import TestCase

from fms_core.services import container, sample
from fms_core.models import Container, SampleKind

TEST_CONTAINERS = {"BARCODECONTAINER1": {"name":"CONTAINER1", "kind": "freezer rack 7x4", "location": "", "coordinates": ""},
                   "BARCODECONTAINER2": {"name":"CONTAINER2", "kind": "tube rack 8x12", "location": "BARCODECONTAINER1", "coordinates": "A01"},
                   "BARCODECONTAINER3": {"name":"CONTAINER3", "kind": "tube", "location": "BARCODECONTAINER2", "coordinates": "A01"},
                   "BARCODECONTAINER8": {"name":"CONTAINER8", "kind": "tube rack 8x12", "location": "BARCODECONTAINER1", "coordinates": "A02"},
                   "BARCODECONTAINER9": {"name":"CONTAINER9", "kind": "96-well plate", "location": "BARCODECONTAINER1", "coordinates": "A03"},}

TEST_CONTAINERS_CREATION = {"BARCODECONTAINER4": {"name":"CONTAINER4", "kind": "tube", "location": "", "coordinates": ""},
                            "BARCODECONTAINER5": {"name":"CONTAINER5", "kind": "tube", "location": "BARCODECONTAINER2", "coordinates": "A02"},
                            "BARCODECONTAINER6": {"name":"CONTAINER6", "kind": "tube", "location": "BARCODECONTAINER2", "coordinates": "A03"},
                            "BARCODECONTAINER7": {"name":"CONTAINER7", "kind": "tube", "location": "BARCODECONTAINER2", "coordinates": ""},}

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
        plate_container = Container.objects.get(barcode="BARCODECONTAINER9")
        sample_kind_dna, _ = SampleKind.objects.get_or_create(name="DNA")
        sample.create_full_sample(name="MrSample",
                                  volume=1000,
                                  concentration=10,
                                  collection_site="Street",
                                  creation_date="2022-02-10",
                                  container=plate_container,
                                  coordinates="A01",
                                  sample_kind=sample_kind_dna,)

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
        # Test create container
        test_create_barcode = "BARCODECONTAINER6"
        location = Container.objects.get(barcode=TEST_CONTAINERS_CREATION[test_create_barcode]["location"])
        testCreationBarcode1, error, warning = container.create_container(barcode=test_create_barcode,
                                                                          kind=TEST_CONTAINERS_CREATION[test_create_barcode]["kind"],
                                                                          name=TEST_CONTAINERS_CREATION[test_create_barcode]["name"],
                                                                          coordinates=TEST_CONTAINERS_CREATION[test_create_barcode]["coordinates"],
                                                                          container_parent=location,
                                                                          creation_comment="Test create.")
        self.assertEqual(testCreationBarcode1.barcode, test_create_barcode)
        self.assertEqual(testCreationBarcode1.comment, "Test create.")
        self.assertEqual(error, [])
        self.assertEqual(warning, [])

        # Test create existing container
        test_create_barcode = "BARCODECONTAINER6"
        location = Container.objects.get(barcode=TEST_CONTAINERS_CREATION[test_create_barcode]["location"])
        testCreationBarcode2, error, warning = container.create_container(barcode=test_create_barcode,
                                                                          kind=TEST_CONTAINERS_CREATION[test_create_barcode]["kind"],
                                                                          name=TEST_CONTAINERS_CREATION[test_create_barcode]["name"],
                                                                          coordinates=TEST_CONTAINERS_CREATION[test_create_barcode]["coordinates"],
                                                                          container_parent=location,
                                                                          creation_comment="Test create existing.")
        self.assertEqual(testCreationBarcode2, None)
        self.assertEqual(error, [f"Container with barcode {test_create_barcode} already exists."])
        self.assertEqual(warning, [])

        # Test create container without coordinates
        test_create_barcode = "BARCODECONTAINER7"
        location = Container.objects.get(barcode=TEST_CONTAINERS_CREATION[test_create_barcode]["location"])
        testCreationBarcode3, error, warning = container.create_container(barcode=test_create_barcode,
                                                                          kind=TEST_CONTAINERS_CREATION[test_create_barcode]["kind"],
                                                                          name=TEST_CONTAINERS_CREATION[test_create_barcode]["name"],
                                                                          coordinates=TEST_CONTAINERS_CREATION[test_create_barcode]["coordinates"],
                                                                          container_parent=location,
                                                                          creation_comment="Test create without coordinates.")
        self.assertEqual(testCreationBarcode3, None)
        self.assertEqual(error, [f"Parent container kind {location.kind} requires that you provide coordinates."])
        self.assertEqual(warning, [])

    def test_is_container_valid_destination(self):
        # Test existing container
        test_barcode = "BARCODECONTAINER9"
        empty_coordinate = "A02"
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode, coordinates=empty_coordinate)
        self.assertEqual(is_valid, True)

        # Test existing container with occupied coordinates
        test_barcode = "BARCODECONTAINER9"
        occupied_coordinate = "A01"
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode, coordinates=occupied_coordinate)
        self.assertEqual(is_valid, False)

        # Test existing container with wrong kind
        test_barcode = "BARCODECONTAINER9"
        kind = "tube"
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode, coordinates=empty_coordinate, kind=kind)
        self.assertEqual(is_valid, False)

        # Test container that is not sample holding
        test_barcode = "BARCODECONTAINER1"
        shelve_empty_coordinates="A04"
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode, coordinates=shelve_empty_coordinates)
        self.assertEqual(is_valid, False)

        # Test not existing container without kind
        test_barcode = "BARCODECONTAINER10"
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode)
        self.assertEqual(is_valid, False)

        # Test not existing container with kind
        test_barcode = "BARCODECONTAINER10"
        kind = "tube"
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode, kind=kind)
        self.assertEqual(is_valid, True)

        # Test not existing container with invalid parent (wrong kind)
        test_barcode = "BARCODECONTAINER10"
        kind = "tube"
        parent_barcode = "BARCODECONTAINER1"
        coordinates="A01"
        parent_container = Container.objects.get(barcode=parent_barcode)
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode,
                                                                            kind=kind,
                                                                            coordinates=coordinates,
                                                                            container_parent=parent_container)
        self.assertEqual(is_valid, False)

        # Test not existing container with valid parent but missing coordinates
        test_barcode = "BARCODECONTAINER10"
        kind = "tube"
        parent_barcode = "BARCODECONTAINER2"
        parent_container = Container.objects.get(barcode=parent_barcode)
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode,
                                                                            kind=kind,
                                                                            container_parent=parent_container)
        self.assertEqual(is_valid, False)

        # Test not existing container with valid parent but bad coordinates
        test_barcode = "BARCODECONTAINER10"
        kind = "tube"
        parent_barcode = "BARCODECONTAINER2"
        coordinates="Z01"
        parent_container = Container.objects.get(barcode=parent_barcode)
        is_valid, error, warning = container.is_container_valid_destination(barcode=test_barcode,
                                                                            kind=kind,
                                                                            coordinates=coordinates,
                                                                            container_parent=parent_container)
        self.assertEqual(is_valid, False)

    def test_rename_container(self):
        # Test rename container (barcode)
        test_old_barcode = "BARCODECONTAINER3"
        test_new_barcode = "BARCODECONTAINERX"
        container_to_update = Container.objects.get(barcode=test_old_barcode)
        testRenameBarcode1, error, warning = container.rename_container(container_to_update=container_to_update,
                                                                        barcode=test_new_barcode,
                                                                        update_comment="Test rename(barcode).")
        self.assertEqual(testRenameBarcode1.barcode, test_new_barcode)
        self.assertEqual(testRenameBarcode1.name, "CONTAINER3")
        self.assertEqual(testRenameBarcode1.update_comment, "Test rename(barcode).")
        self.assertEqual(error, [])
        self.assertEqual(warning, [])

        # Test rename container (name)
        test_old_barcode = "BARCODECONTAINERX"
        test_new_name = "RENAMEDCONTAINER"
        container_to_update = Container.objects.get(barcode=test_old_barcode)
        testRenameBarcode2, error, warning = container.rename_container(container_to_update=container_to_update,
                                                                        name=test_new_name,
                                                                        update_comment="Test rename(name).")
        self.assertEqual(testRenameBarcode2.barcode, test_old_barcode)
        self.assertEqual(testRenameBarcode2.name, test_new_name)
        self.assertEqual(testRenameBarcode2.update_comment, "Test rename(name).")
        self.assertEqual(error, [])
        self.assertEqual(warning, [])

        # Test rename container (barcode + name)
        test_old_barcode = "BARCODECONTAINERX"
        test_new_barcode = "BARCODECONTAINER3"
        test_new_name = "RENAMEDCONTAINERAGAIN"
        container_to_update = Container.objects.get(barcode=test_old_barcode)
        testRenameBarcode3, error, warning = container.rename_container(container_to_update=container_to_update,
                                                                        barcode=test_new_barcode,
                                                                        name=test_new_name,
                                                                        update_comment="Test rename(barcode and name).")
        self.assertEqual(testRenameBarcode3.barcode, test_new_barcode)
        self.assertEqual(testRenameBarcode3.name, test_new_name)
        self.assertEqual(testRenameBarcode3.update_comment, "Test rename(barcode and name).")
        self.assertEqual(error, [])
        self.assertEqual(warning, [])

        # Test rename container missing param
        test_old_barcode = "BARCODECONTAINER3"
        container_to_update = Container.objects.get(barcode=test_old_barcode)
        testRenameBarcode4, error, warning = container.rename_container(container_to_update=container_to_update,
                                                                        update_comment="Test rename().")
        self.assertEqual(testRenameBarcode4.barcode, test_old_barcode)
        self.assertEqual(error, ["Either New Barcode or New Name are required."])
        self.assertEqual(warning, [])

    def test_move_container(self):
        # Test move container
        test_container_barcode = "BARCODECONTAINER3"
        test_destination_barcode = "BARCODECONTAINER8"
        container_to_move = Container.objects.get(barcode=test_container_barcode)
        testMoveBarcode1, error, warning = container.move_container(container_to_move=container_to_move,
                                                                    destination_barcode=test_destination_barcode,
                                                                    destination_coordinates="A01",
                                                                    update_comment="Test move.")
        self.assertEqual(testMoveBarcode1.barcode, test_container_barcode)
        self.assertEqual(testMoveBarcode1.location.barcode, test_destination_barcode)
        self.assertEqual(testMoveBarcode1.coordinates, "A01")
        self.assertEqual(testMoveBarcode1.update_comment, "Test move.")
        self.assertEqual(error, [])
        self.assertEqual(warning, [])

        # Test move container missing destination
        test_container_barcode = "BARCODECONTAINER3"
        test_starting_location_barcode = test_destination_barcode
        parent_container = Container.objects.get(barcode=test_starting_location_barcode)
        container_to_move = Container.objects.get(barcode=test_container_barcode, location=parent_container.id)
        testMoveBarcode2, error, warning = container.move_container(container_to_move=container_to_move,
                                                                    destination_barcode="",
                                                                    destination_coordinates="A02",
                                                                    update_comment="Test move missing destination.")
        self.assertEqual(testMoveBarcode2.barcode, test_container_barcode)
        self.assertEqual(testMoveBarcode2.location.barcode, parent_container.barcode)
        self.assertEqual(testMoveBarcode2.coordinates, "A01")
        self.assertEqual(testMoveBarcode2.update_comment, "Test move.")
        self.assertEqual(error, ["Destination location barcode is required."])
        self.assertEqual(warning, [])

        # Test move container destination does not exist
        test_container_barcode = "BARCODECONTAINER3"
        test_destination_barcode = "BARCODEMISSINGCONTAINER"
        test_starting_location_barcode = "BARCODECONTAINER8"
        parent_container = Container.objects.get(barcode=test_starting_location_barcode)
        container_to_move = Container.objects.get(barcode=test_container_barcode, location=parent_container.id)
        testMoveBarcode3, error, warning = container.move_container(container_to_move=container_to_move,
                                                                    destination_barcode=test_destination_barcode,
                                                                    destination_coordinates="A02",
                                                                    update_comment="Test move destination does not exist.")
        self.assertEqual(testMoveBarcode3.barcode, test_container_barcode)
        self.assertEqual(testMoveBarcode3.location.barcode, parent_container.barcode)
        self.assertEqual(testMoveBarcode3.coordinates, "A01")
        self.assertEqual(testMoveBarcode3.update_comment, "Test move.")
        self.assertEqual(error, [f"Destination Container barcode {test_destination_barcode} does not exist."])
        self.assertEqual(warning, [])

        # Test move container same position
        test_container_barcode = "BARCODECONTAINER3"
        test_destination_barcode = "BARCODECONTAINER8"
        test_starting_location_barcode = "BARCODECONTAINER8"
        parent_container = Container.objects.get(barcode=test_starting_location_barcode)
        container_to_move = Container.objects.get(barcode=test_container_barcode, location=parent_container.id)
        testMoveBarcode4, error, warning = container.move_container(container_to_move=container_to_move,
                                                                    destination_barcode=test_destination_barcode,
                                                                    destination_coordinates="A01",
                                                                    update_comment="Test move same position.")
        self.assertEqual(testMoveBarcode4.barcode, test_container_barcode)
        self.assertEqual(testMoveBarcode4.location.barcode, parent_container.barcode)
        self.assertEqual(testMoveBarcode4.coordinates, "A01")
        self.assertEqual(testMoveBarcode4.update_comment, "Test move.")
        self.assertEqual(error, [f"Container {container_to_move.name } already is at container {test_destination_barcode} at coodinates A01."])
        self.assertEqual(warning, [])
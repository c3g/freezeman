from django.test import TestCase
from django.contrib.contenttypes.models import ContentType

from fms_core.template_importer.importers import ContainerMoveImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Container

from fms_core.services.container import create_container


class ContainerMoveTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ContainerMoveImporter()
        self.file = APP_DATA_ROOT / "Container_move_v3_5_0.xlsx"
        ContentType.objects.clear_cache()

        self.container2move_barcode = 'CONTAINER2MOVE'
        self.destination_barcode = 'LOCATION_CONTAINER'
        self.destination_coordinates = 'A01'

        self.prefill_data()


    def prefill_data(self):
        #Create container
        (container, errors, warnings) = create_container(barcode=self.container2move_barcode, kind='Tube', name='Container2Move')

        #Create destination container
        (container, errors, warnings) = create_container(barcode=self.destination_barcode, kind='Tube box 6x6',
                                                         name='location_container')

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        container = Container.objects.get(barcode=self.container2move_barcode)
        self.assertEqual(container.location.barcode, self.destination_barcode)
        self.assertEqual(container.coordinates, self.destination_coordinates)




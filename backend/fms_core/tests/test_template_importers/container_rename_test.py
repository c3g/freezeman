from django.test import TestCase
from django.contrib.contenttypes.models import ContentType

from fms_core.template_importer.importers import ContainerRenameImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Container

from fms_core.services.container import create_container


class ContainerRenameTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ContainerRenameImporter()
        self.file = APP_DATA_ROOT / "Container_rename_vtest.xlsx"
        ContentType.objects.clear_cache()

        self.container_barcode = 'CONTAINER4RENAME'
        self.container_new_barcode = 'NEW_CONTAINER_BARCODE'
        self.container_new_name = 'NEW_CONTAINER_NAME'

        self.prefill_data()


    def prefill_data(self):
        (container, errors, warnings) = create_container(barcode=self.container_barcode, kind='Tube', name='Container4Rename')

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        container = Container.objects.get(barcode=self.container_new_barcode)
        self.assertEqual(container.barcode, self.container_new_barcode)
        self.assertEqual(container.name, self.container_new_name)




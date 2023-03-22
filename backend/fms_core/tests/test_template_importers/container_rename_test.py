from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from fms_core.template_importer.importers import ContainerRenameImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

from fms_core.models import Container

from fms_core.services.container import create_container


class ContainerRenameTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ContainerRenameImporter()
        self.file = APP_DATA_ROOT / "Container_rename_v3_5_0.xlsx"
        ContentType.objects.clear_cache()

        self.container_barcode = 'CONTAINER4RENAME'
        self.container_new_barcode = 'NEW_CONTAINER_BARCODE'
        self.container_new_name = 'NEW_CONTAINER_NAME'

        self.invalid_template_tests = ["Container_rename_v3_5_0_rename_invalid.xlsx",
                                       "Container_rename_v3_5_0_same_rename.xlsx",
                                       "Container_rename_v3_5_0_double_rename.xlsx",]

        self.prefill_data()


    def prefill_data(self):
        (container, _, _) = create_container(barcode=self.container_barcode, kind='Tube', name='Container4Rename')
        (container2, _, _) = create_container(barcode="NAMEALREADYEXISTS", kind='Tube', name='NameAlreadyExists')

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        container = Container.objects.get(barcode=self.container_new_barcode)
        self.assertEqual(container.barcode, self.container_new_barcode)
        self.assertEqual(container.name, self.container_new_name)

    def test_invalid_container_rename(self):
        for f in self.invalid_template_tests:
            s = transaction.savepoint()
            result = load_template(importer=self.importer, file=TEST_DATA_ROOT / f)
            self.assertEqual(result['valid'], False)
            transaction.savepoint_rollback(s)

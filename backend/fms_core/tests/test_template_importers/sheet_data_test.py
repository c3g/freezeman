from django.test import TestCase
from fms_core.template_importer.importers.container_creation import ContainerCreationImporter

from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

class SheetDataTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ContainerCreationImporter()

    def test_empty_rows(self):
        # extract sheets from container creation for test
        file = APP_DATA_ROOT / "Container_creation_empty_row_v4_2_0.xlsx"

        result = load_template(importer=self.importer, file=file)

        self.assertEqual(result['valid'], False)
        self.assertIsNotNone(result['base_errors'])

    def test_empty_columns(self):

        file = APP_DATA_ROOT / "Container_creation_empty_column_v4_2_0.xlsx"

        result = load_template(importer=self.importer, file=file)

        self.assertEqual(result['result_previews'][0]['valid'], True)
        self.assertEquals(len(result['result_previews'][0]['headers']), 7)
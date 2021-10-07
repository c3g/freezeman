from django.test import TestCase
from django.contrib.contenttypes.models import ContentType

from fms_core.template_importer.importers import SampleSubmissionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT


class SampleSubmissionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleSubmissionImporter()
        self.file = APP_DATA_ROOT / "Sample_submission_vtest.xlsx"
        ContentType.objects.clear_cache()

    def test_import(self):
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)



from django.test import TestCase
from django.contrib.contenttypes.models import ContentType

from pathlib import Path
import reversion
from reversion.models import Version

from fms_core.template_importer.importers import SampleSubmissionImporter

APP_DATA_ROOT = Path(__file__).parent / "valid_templates"
TEST_DATA_ROOT = Path(__file__).parent / "invalid_templates"

SAMPLE_SUBMISSION_XLSX = APP_DATA_ROOT / "Sample_submission_vtest.xlsx"


class SampleSubmissionTestCase(TestCase):
    def setUp(self) -> None:
        ContentType.objects.clear_cache()

        self.importer = SampleSubmissionImporter()

    def load_samples(self):
        file = SAMPLE_SUBMISSION_XLSX

        with reversion.create_revision():
            try:
                result = self.importer.import_template(file=file, format='xlsx', dry_run=True)
            except Exception as e:
                print(e)
                result = {
                    'valid': False,
                    'base_errors': [{
                        "error": str(e),
                        }],
                }


            reversion.set_comment("Loaded samples")


    def test_import(self):
        self.load_samples()

        # self.assertEqual ..
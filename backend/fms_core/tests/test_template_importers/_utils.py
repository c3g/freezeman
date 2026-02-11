import io
from pathlib import Path
import reversion

from fms_core.template_importer.importers._generic import GenericImporter, BytesIOWithName

APP_DATA_ROOT = Path(__file__).parent.parent / "valid_templates"
TEST_DATA_ROOT = Path(__file__).parent.parent / "invalid_templates"

def load_template(importer: GenericImporter, file: Path | BytesIOWithName):
    with reversion.create_revision():
        try:
            result = importer.import_template(file=file, dry_run=False)
        except Exception as e:
            result = {
                'valid': False,
                'base_errors': [{
                    "error": str(e),
                }],
            }

        reversion.set_comment("Test Template Importer")

    return result


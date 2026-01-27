from collections.abc import Callable
from pathlib import Path
from openpyxl import Workbook
import reversion

APP_DATA_ROOT = Path(__file__).parent.parent / "valid_templates"
TEST_DATA_ROOT = Path(__file__).parent.parent / "invalid_templates"

def load_template(importer, file, workbook_generator: Callable[[], Workbook] | None = None):
    with reversion.create_revision():
        try:
            result = importer.import_template(file=file, dry_run=False, workbook_generator=workbook_generator)
        except Exception as e:
            result = {
                'valid': False,
                'base_errors': [{
                    "error": str(e),
                }],
            }

        reversion.set_comment("Test Template Importer")

    return result


from pathlib import Path
import reversion

APP_DATA_ROOT = Path(__file__).parent.parent / "valid_templates"
TEST_DATA_ROOT = Path(__file__).parent.parent / "invalid_templates"

def load_template(importer, file):
    with reversion.create_revision():
        try:
            result = importer.import_template(file=file, format='xlsx', dry_run=False)
        except Exception as e:
            result = {
                'valid': False,
                'base_errors': [{
                    "error": str(e),
                }],
            }

        reversion.set_comment("Test Template Importer")

    return result


from openpyxl import Workbook
from openpyxl.styles import PatternFill

from fms_core.services.workbook_utils import insert_cells, CD

headerPatternFill = PatternFill(start_color="92d050", end_color="92d050", fill_type="solid")
def style_section_name(cell):
    cell.fill = headerPatternFill

HEADERS_ROW = 4 # 1-indexed

class HeaderNames:
    CONTAINER_BARCODE = 'Container Barcode'
    CONTAINER_COORD = 'Container Coord'
    INDEX_NAME = 'Index Name'
    OLD_SAMPLE_NAME = 'Old Sample Name'
    OLD_SAMPLE_ALIAS = 'Old Sample Alias'
    NEW_SAMPLE_NAME = 'New Sample Name'
    NEW_SAMPLE_ALIAS = 'New Sample Alias'

# beware that column numbers are 1-indexed when using openpyxl, but 0-indexed in the HEADERS list
HEADERS = [
    HeaderNames.CONTAINER_BARCODE,
    HeaderNames.CONTAINER_COORD,
    HeaderNames.INDEX_NAME,
    HeaderNames.OLD_SAMPLE_NAME,
    HeaderNames.OLD_SAMPLE_ALIAS,
    HeaderNames.NEW_SAMPLE_NAME,
    HeaderNames.NEW_SAMPLE_ALIAS,
]
def header_to_column(header_name):
    try:
        return HEADERS.index(header_name) + 1
    except ValueError:
        raise ValueError(f"Header '{header_name}' not found in HEADERS list.")

def create_workbook():
    workbook = Workbook()

    workbook.create_sheet(title="SampleRename")
    samplesheet = workbook["SampleRename"]
    del workbook["Sheet"]

    insert_cells(
        samplesheet,
        first_cell_location=(1, 1),
        order="row",
        descriptors=[
            [
                CD(value="Sample Rename Template")
            ],
            [
                CD(value="Naming Rules")
            ],
            [
                CD(
                    "- Only use the following characters for Sample Name and Sample Alias: a-z, A-Z, 0-9, underscore (_), hyphen (-)",
                )
            ],
            [
                CD(
                    value=HeaderNames.CONTAINER_BARCODE,
                    comment="The current barcode of the sample to be renamed.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value=HeaderNames.CONTAINER_COORD,
                    comment="The current coordinate of the sample to be renamed.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value=HeaderNames.INDEX_NAME,
                    comment="The index name associated with the sample to be renamed.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value=HeaderNames.OLD_SAMPLE_NAME,
                    comment="The current name of the sample to be renamed.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value=HeaderNames.OLD_SAMPLE_ALIAS,
                    comment="The current alias of the sample to be renamed.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value=HeaderNames.NEW_SAMPLE_NAME,
                    comment="The new name to assign to the sample.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value=HeaderNames.NEW_SAMPLE_ALIAS,
                    comment="The new alias to assign to the sample.",
                    apply_cell=style_section_name,
                ),
            ],
        ],
    )

    return workbook
from openpyxl import Workbook
from openpyxl.styles import PatternFill

from fms_core.services.workbook_utils import insert_cells, CD

headerPatternFill = PatternFill(start_color="92d050", end_color="92d050", fill_type="solid")
def style_section_name(cell):
    cell.fill = headerPatternFill

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
                CD(
                    value="Container Barcode",
                    comment="The current barcode of the sample to be renamed.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value="Old Sample Name",
                    comment="The current name of the sample to be renamed.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value="Old Sample Alias",
                    comment="The current alias of the sample to be renamed.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value="New Sample Name",
                    comment="The new name to assign to the sample.",
                    apply_cell=style_section_name,
                ),
                CD(
                    value="New Sample Alias",
                    comment="The new alias to assign to the sample.",
                    apply_cell=style_section_name,
                ),
            ],
        ],
    )

    return workbook
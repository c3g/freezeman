from typing import Sequence
from ._generic import SheetInfo, TemplateWorkbook
from openpyxl.styles import Color, PatternFill, Font
from openpyxl.cell.cell import Cell
from openpyxl.cell.rich_text import TextBlock, CellRichText
from openpyxl.cell.text import InlineFont

from fms_core.services.workbook_utils import CD

SHEET_NAMES = ["SampleRename"]

class SampleRenameWorkbook(TemplateWorkbook):
    def __init__(self, sheets_info: Sequence[SheetInfo]):
        super().__init__(sheets_info)

        def style_title(cell: Cell):
            cell.font = Font(name="Calibri", sz=15, family=2, b=True, i=False, color=Color(theme=1), scheme="minor")

        OPTIONAL_PATTERN_FILL = PatternFill(start_color="d1d1d1", end_color="d1d1d1", fill_type="solid")
        def style_optional_section(cell: Cell):
            cell.fill = OPTIONAL_PATTERN_FILL

        MANDATORY_PATTERN_FILL = PatternFill(start_color="ffa6a6", end_color="ffa6a6", fill_type="solid")
        def style_mandatory_section(cell: Cell):
            cell.fill = MANDATORY_PATTERN_FILL

        HEADER_PATTERN_FILL = PatternFill(start_color="92d050", end_color="92d050", fill_type="solid")
        def style_section_name(cell: Cell):
            cell.fill = HEADER_PATTERN_FILL

        self.insert_cells(
            first_cell_location=(1, 1),
            order="row",
            descriptors=[
                # row 1
                [
                    CD(value="Sample Rename Template", apply_cell=style_title)
                ],
                # row 2
                [
                    CellRichText(
                        "(",
                        TextBlock(InlineFont(rFont="Calibri", color="00ff0000"), "*"),
                        ") Mandatory fields",
                    ),
                    CD(value="Version : 5.6.0"),
                ],
                [],
                # row 4
                [
                    CD(value="Naming Rules")
                ],
                # row 5
                [
                    CD(
                        "- Only use the following characters for Sample Name and Sample Alias: a-z, A-Z, 0-9, underscore (_), hyphen (-)",
                    )
                ],
                # row 6
                [
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_mandatory_section),
                    CD(value='', apply_cell=style_mandatory_section),
                ],
                # row 7 (headers)
                [
                    CD(
                        value='Container Barcode',
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value='Container Coordinates',
                        apply_cell=style_section_name,
                        comment="To identify a sample in a well, rack, plate, box, etc.",
                    ),
                    CD(
                        value='Index Name',
                        apply_cell=style_section_name,
                        comment="To identify a sample within a pool",
                    ),
                    CD(
                        value='Old Sample Name',
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value='Old Sample Alias',
                        apply_cell=style_section_name,
                        comment="Run processing uses Alias to name samples in the files generated during run processing.",
                    ),
                    CD(
                        value='New Sample Name',
                        apply_cell=style_section_name,
                        comment="This name change will only affect Freezeman and not the files generated during run processing.",
                    ),
                    CD(
                        value='New Sample Alias',
                        apply_cell=style_section_name,
                        comment="This Alias change will affect the files generated during run processing.",
                    ),
                ],
            ],
            sheet_name=SHEET_NAMES[0],
        )

        for header_name in self.sheets_info[0]['headers']:
            self.set_column_width(header=header_name, width_cm=6.60, sheet_name=SHEET_NAMES[0])

    def headers_row_number(self, sheet_name: str | None = None) -> int:
        return 7

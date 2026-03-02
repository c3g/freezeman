from typing import Sequence
from ._generic import SheetInfo, TemplateWorkbook
from openpyxl.styles import Color, PatternFill, Font
from openpyxl.cell.cell import Cell

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
                [],
                # row 3
                [
                    CD(value="Naming Rules")
                ],
                # row 4
                [
                    CD(
                        "- Only use the following characters for Sample Name and Sample Alias: a-z, A-Z, 0-9, underscore (_), hyphen (-)",
                    )
                ],
                # row 5
                [
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_optional_section),
                    CD(value='', apply_cell=style_mandatory_section),
                    CD(value='', apply_cell=style_mandatory_section),
                ],
                # row 6 (headers)
                [
                    CD(
                        value='Container Barcode',
                        comment="The current barcode of the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value='Container Coordinate',
                        comment="The current coordinate of the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value='Index Name',
                        comment="The index name associated with the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value='Old Sample Name',
                        comment="The current name of the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value='Old Sample Alias',
                        comment="The current alias of the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value='New Sample Name',
                        comment="The new name to assign to the sample.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value='New Sample Alias',
                        comment="The new alias to assign to the sample.",
                        apply_cell=style_section_name,
                    ),
                ],
            ],
            sheet_name=SHEET_NAMES[0],
        )

        for header_name in self.sheets_info[0]['headers']:
            self.set_column_width(header=header_name, width_cm=6.60, sheet_name=SHEET_NAMES[0])

    def headers_row_number(self, sheet_name: str | None = None) -> int:
        return 4

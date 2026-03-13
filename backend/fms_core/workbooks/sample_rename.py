from typing import Sequence
from ._generic import SheetInfo, TemplateWorkbook
from openpyxl.styles import Color, PatternFill, Font, Alignment
from openpyxl.cell.cell import Cell
from openpyxl.cell.rich_text import TextBlock, CellRichText
from openpyxl.cell.text import InlineFont

from fms_core.services.workbook_utils import CD
from fms_core.templates import SampleRenameHeaders

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

        red_asterisk = TextBlock(InlineFont(rFont="Calibri", color="00ff0000"), "*")

        self.insert_cells(
            first_cell_location=(1, 1),
            order="row",
            descriptors=[
                [
                    CD(value="Sample Rename Template", apply_cell=style_title)
                ],
                [
                    CellRichText(
                        "(",
                        red_asterisk,
                        ") Mandatory fields",
                    ),
                    CD(value="Version : 5.6.0"),
                ],
                [],
                [
                    CD("- Only use the following characters for Sample Name and Sample Alias: a-z, A-Z, 0-9, underscore (_), hyphen (-)")
                ],
                [
                    CD("- Run Processing uses the alias of a sample to identify the sample, not the name.")
                ],
                [],
                [
                    CellRichText(red_asterisk), # barcode
                    CD(value=''), # coordinates
                    CD(value=''), # index name
                    CD(value=''), # old name
                    CD(value=''), # old alias
                    CellRichText(red_asterisk), # new name (this will be merged with the "new alias")
                    CellRichText(red_asterisk), # new alias
                ],
                [
                    CD(
                        value=SampleRenameHeaders.CONTAINER_BARCODE,
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value=SampleRenameHeaders.CONTAINER_COORDINATES,
                        apply_cell=style_section_name,
                        comment="To identify a sample in a rack, plate, box, etc.",
                    ),
                    CD(
                        value=SampleRenameHeaders.INDEX_NAME,
                        apply_cell=style_section_name,
                        comment="To identify a sample within a pool",
                    ),
                    CD(
                        value=SampleRenameHeaders.OLD_SAMPLE_NAME,
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value=SampleRenameHeaders.OLD_SAMPLE_ALIAS,
                        apply_cell=style_section_name,
                        comment="Run processing uses Alias to name samples in the files generated during run processing.",
                    ),
                    CD(
                        value=SampleRenameHeaders.NEW_SAMPLE_NAME,
                        apply_cell=style_section_name,
                        comment="Changing the name will only affect Freezeman and not the files generated during run processing.",
                    ),
                    CD(
                        value=SampleRenameHeaders.NEW_SAMPLE_ALIAS,
                        apply_cell=style_section_name,
                        comment="Changing the alias will affect the files generated during run processing.",
                    ),
                ],
            ],
            sheet_name=SHEET_NAMES[0],
        )

        center_alignment = Alignment(horizontal="center")

        ws = self.get_sheet_by_name(SHEET_NAMES[0])
        ws['A7'].alignment = center_alignment # barcode
        ws['F7'].alignment = center_alignment # new name
        ws['G7'].alignment = center_alignment # new alias


        for header_name in self.sheets_info[0]['headers']:
            self.set_column_width(header=header_name, width_cm=6.60, sheet_name=SHEET_NAMES[0])

    def headers_row_number(self, sheet_name: str | None = None) -> int:
        return 8

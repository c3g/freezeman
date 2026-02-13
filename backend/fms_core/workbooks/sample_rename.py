from typing import TypedDict, Literal
from ._generic import TemplateWorkbook
from openpyxl.styles import PatternFill
from openpyxl.cell.cell import Cell

from fms_core.services.workbook_utils import insert_cells, CD

Header_ID = (
    Literal["CONTAINER_BARCODE"] |
    Literal["CONTAINER_COORD"] |
    Literal["INDEX_NAME"] |
    Literal["OLD_SAMPLE_NAME"] |
    Literal["OLD_SAMPLE_ALIAS"] |
    Literal["NEW_SAMPLE_NAME"] |
    Literal["NEW_SAMPLE_ALIAS"]
)

class HeaderNameByID(TypedDict):
    CONTAINER_BARCODE: str
    CONTAINER_COORD: str
    INDEX_NAME: str
    OLD_SAMPLE_NAME: str
    OLD_SAMPLE_ALIAS: str
    NEW_SAMPLE_NAME: str
    NEW_SAMPLE_ALIAS: str

class SampleRenameWorkbook(TemplateWorkbook[HeaderNameByID, Header_ID]):
    HEADERS_ROW = 4 # 1-indexed

    def __init__(self, header_names: HeaderNameByID, header_ids: list[Header_ID]):
        super().__init__(header_names, header_ids)

        self.create_sheet(title="SampleRename")
        self.sample_rename_worksheet = self["SampleRename"]
        del self["Sheet"]

        headerPatternFill = PatternFill(start_color="92d050", end_color="92d050", fill_type="solid")
        def style_section_name(cell: Cell):
            cell.fill = headerPatternFill

        insert_cells(
            self.sample_rename_worksheet,
            first_cell_location=(1, 1),
            order="row",
            descriptors=[
                # row 1
                [
                    CD(value="Sample Rename Template")
                ],
                # row 2
                [
                    CD(value="Naming Rules")
                ],
                # row 3
                [
                    CD(
                        "- Only use the following characters for Sample Name and Sample Alias: a-z, A-Z, 0-9, underscore (_), hyphen (-)",
                    )
                ],
                # row 4 (headers)
                [
                    CD(
                        value=header_names['CONTAINER_BARCODE'],
                        comment="The current barcode of the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value=header_names['CONTAINER_COORD'],
                        comment="The current coordinate of the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value=header_names['INDEX_NAME'],
                        comment="The index name associated with the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value=header_names['OLD_SAMPLE_NAME'],
                        comment="The current name of the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value=header_names['OLD_SAMPLE_ALIAS'],
                        comment="The current alias of the sample to be renamed.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value=header_names['NEW_SAMPLE_NAME'],
                        comment="The new name to assign to the sample.",
                        apply_cell=style_section_name,
                    ),
                    CD(
                        value=header_names['NEW_SAMPLE_ALIAS'],
                        comment="The new alias to assign to the sample.",
                        apply_cell=style_section_name,
                    ),
                ],
            ],
        )

        for col_num in range(ord('A'), ord('A') + len(self.HEADERS)):
            col = chr(col_num)
            CM_TO_WHATEVER = 4.489795918
            self.sample_rename_worksheet.column_dimensions[col].width = 6.60 * CM_TO_WHATEVER

    # beware that column numbers are 1-indexed when using openpyxl, but 0-indexed in the HEADERS list
    def header_to_column(self, header_name):
        """
        Given a header name, returns the corresponding column number in the worksheet (1-indexed).
        
        :returns: the corresponding column number (1-indexed) in the worksheet
        """
        return self.HEADERS.index(header_name) + 1


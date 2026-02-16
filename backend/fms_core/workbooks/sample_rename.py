from typing import Sequence, Literal
from ._generic import TemplateWorkbook
from openpyxl.styles import PatternFill
from openpyxl.cell.cell import Cell

from fms_core.services.workbook_utils import insert_cells, CD


Header_Name = Literal[
    'Container Barcode',
    'Container Coordinate',
    'Index Name',
    'Old Sample Name',
    'Old Sample Alias',
    'New Sample Name',
    'New Sample Alias',
]

class SampleRenameWorkbook(TemplateWorkbook[Header_Name]):
    def __init__(self, headers: Sequence[Header_Name]):
        super().__init__(headers)

        self.create_sheet(title="SampleRename")
        del self["Sheet"]
        self.active = self.sample_rename_worksheet = self["SampleRename"]

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
        )

        for header_name in self.headers:
            self.set_column_width(header=header_name, width_cm=6.60)

    def headers_row_number(self) -> int:
        return 4

from collections.abc import Iterable
from typing import Generic, Literal, Sequence, TypeVar, TypedDict
from openpyxl import Workbook

from fms_core.services.workbook_utils import CellDescription, insert_cells

Header_Name = TypeVar('Header_Name', bound=str)

class TemplateWorkbook(Workbook, Generic[Header_Name]):
    def __init__(self, headers: Sequence[Header_Name]):
        super().__init__()
        self.headers = headers

    # beware that column numbers are 1-indexed when using openpyxl, but 0-indexed in the HEADERS list
    def header_to_column_number(self, header: Header_Name) -> int:
        """
        Given a header name, returns the corresponding column number in the worksheet (1-indexed).
        
        :returns: the corresponding column number (1-indexed) in the worksheet
        """
        return self.headers.index(header) + 1

    def set_column_width(self, header: Header_Name, width_cm: float) -> None:
        col_num = self.header_to_column_number(header)
        col_ord = chr(ord('A') + col_num - 1)
        CM_TO_WHATEVER = 4.489795918
        self.active.column_dimensions[col_ord].width = width_cm * CM_TO_WHATEVER # pyright: ignore[reportOptionalMemberAccess] access to column_dimensions should be valid

    def headers_row_number(self) -> int:
        """
        :return: 1-indexed row number where headers are located
        """
        raise NotImplementedError("Subclasses of TemplateWorkbook must implement headers_row_number() to specify where headers are located in the worksheet")

    def insert_cells(self, first_cell_location: tuple[int, int], descriptors: Iterable[Iterable[CellDescription]], order: Literal["row", "col"]):
        assert self.active is not None, "Active worksheet must be set before inserting cells"
        insert_cells(
            worksheet=self.active,
            first_cell_location=first_cell_location,
            descriptors=descriptors,
            order=order,
        )

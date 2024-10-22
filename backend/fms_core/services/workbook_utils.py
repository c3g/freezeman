from dataclasses import dataclass
from typing import Callable, Iterable, Literal
from openpyxl.cell.cell import Cell
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.worksheet import Worksheet

@dataclass
class CellDescription:
    value: str
    validation: DataValidation | None = None
    apply_cell: Callable[[Cell], None] | None = None

CD = CellDescription

def insert_cells(worksheet: Worksheet, first_cell_location: tuple[int, int], descriptors: Iterable[Iterable[CellDescription]], order: Literal["row"] | Literal["col"]):
    validations = set()

    for outer_offset, descriptor_row in enumerate(descriptors):
        for inner_offset, cell_description in enumerate(descriptor_row):
            row_offset = outer_offset if order == "row" else inner_offset
            column_offset = outer_offset if order == "col" else inner_offset
            cell = worksheet.cell(row=first_cell_location[0] + row_offset, column=first_cell_location[1] + column_offset, value=cell_description.value)

            validation = cell_description.validation
            if validation is not None:
                validation.add(cell)
                if validation not in validations:
                    worksheet.add_data_validation(cell_description.validation)
                    validations.add(validation)

            if cell_description.apply_cell is not None:
                cell_description.apply_cell(cell)

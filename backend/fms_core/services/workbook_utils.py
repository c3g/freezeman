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
    id: str | None = None

CD = CellDescription

def insert_cells(worksheet: Worksheet, topleft: tuple[int, int], descriptors: Iterable[Iterable[CellDescription]], order: Literal["row"] | Literal["col"]):
    validations = set()
    cells_by_id = dict[str, Cell]()

    for outer_offset, row_entries in enumerate(descriptors):
        for inner_offset, cell_description in enumerate(row_entries):
            row_offset = outer_offset if order == "row" else inner_offset
            column_offset = outer_offset if order == "col" else inner_offset
            cell = worksheet.cell(row=topleft[0] + row_offset, column=topleft[1] + column_offset, value=cell_description.value)

            validation = cell_description.validation
            if validation is not None:
                validation.add(cell)
                if validation not in validations:
                    worksheet.add_data_validation(cell_description.validation)
                    validations.add(validation)

            if cell_description.apply_cell is not None:
                cell_description.apply_cell(cell)

            if cell_description.id is not None:
                cells_by_id[cell_description.id] = cell

    return cells_by_id

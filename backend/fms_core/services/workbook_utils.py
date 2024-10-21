from openpyxl.cell.cell import Cell
from openpyxl.worksheet.worksheet import Worksheet

def add_horizontal_table(worksheet: Worksheet, headers: list[str], data: list[list[str]], topleft: tuple[int, int]):
    header_cells = list[Cell]()
    data_cells = list[list[Cell]]()

    for col_offset, header in enumerate(headers):
        header_cells.append(worksheet.cell(row=topleft[0], column=topleft[1]+col_offset, value=header))
    for row_offset, row_data in enumerate(data):
        row_cells = list[Cell]()
        for col_offset, value in enumerate(row_data):
            # +1 to skip the header row
            row_cells.append(worksheet.cell(row=topleft[0]+row_offset+1, column=topleft[1]+col_offset, value=value))
        data_cells.append(row_cells)

    return header_cells, data_cells

def add_vertical_table(worksheet: Worksheet, headers: list[str], data: list[list[str]], topleft: tuple[int, int]):
    header_cells = list[Cell]()
    data_cells = list[list[Cell]]()

    for row_rel_index, header in enumerate(headers):
        header_cells.append(worksheet.cell(row=topleft[0]+row_rel_index, column=topleft[1], value=header))
    for col_rel_index, col_data in enumerate(data):
        col_cells = list[Cell]()
        for row_rel_index, value in enumerate(col_data):
            # +1 to skip the header column
            col_cells.append(worksheet.cell(row=topleft[0]+row_rel_index, column=topleft[1]+col_rel_index+1, value=value))
        data_cells.append(col_cells)

    return header_cells, data_cells
"""Convert an Excel workbook to plain text so that `git diff` can show cell-level changes.

Use it as a git `textconv` driver. See the "Diff Excel files with git" section of `backend/README.md`.
"""
import argparse
import sys
from datetime import date, time
from typing import Iterable, Iterator, Optional

from openpyxl import load_workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.worksheet import Worksheet

_HEADER_SCAN_ROWS = 20
_MIN_HEADER_CELLS = 3


def _format_name(name: DefinedName) -> str:
    """Format a defined name as `<name>: <reference>` with its optional flags.

    Args:
        name: The defined name (named range) to format.

    Returns:
        The text for the name, without any scope prefix.
    """
    text = f"{name.name}: {name.attr_text}"
    if name.hidden:
        text += " [hidden]"
    if name.comment:
        text += f" comment={name.comment!r}"
    return text


def _sorted_names(names: Iterable[DefinedName]) -> list[DefinedName]:
    """Sort defined names alphabetically so that their internal order never shows as a change."""
    return sorted(names, key=lambda n: n.name)


def _find_header_row(ws: Worksheet) -> Optional[int]:
    """Find the header row of a sheet: the row with the most non-empty text cells in the first rows.

    Args:
        ws: The worksheet to inspect.

    Returns:
        The row number, or `None` if no row has at least `_MIN_HEADER_CELLS` text cells.
        On a tie, the first row wins.
    """
    best_row, best_count = None, 0
    for row in ws.iter_rows(max_row=_HEADER_SCAN_ROWS):
        count = sum(1 for cell in row if isinstance(cell.value, str) and cell.value.strip())
        if count > best_count:
            best_row, best_count = row[0].row, count
    return best_row if best_count >= _MIN_HEADER_CELLS else None


def dump_workbook(path: str, by_column: bool = False) -> Iterator[str]:
    """Yield one text line per item of the workbook: cells, merges, validations and named ranges.

    Formulas appear as formula text. Values use `repr()` so that `"1"` and `1` differ.

    Args:
        path: Path to the `.xlsx` or `.xlsm` file.
        by_column: Print the cells column by column (A1, A2, B1, B2) instead of row by row (A1, B1, A2, B2).
            Column order keeps a new column in one block of the diff. Each cell below the header row
            (see `_find_header_row`) also shows the header text of its column after the coordinate,
            as `Sheet!N7 [Header]: value`.

    Yields:
        The lines of the text representation, in workbook order.
    """
    wb = load_workbook(path, data_only=False)
    for ws in wb.worksheets:
        yield f"=== Sheet: {ws.title} [state={ws.sheet_state}] ==="
        cell_groups = ws.iter_cols() if by_column else ws.iter_rows()
        header_row = _find_header_row(ws) if by_column else None
        headers: dict[str, str] = {}
        if header_row is not None:
            headers = {
                cell.column_letter: cell.value.strip()
                for cell in ws[header_row]
                if isinstance(cell.value, str) and cell.value.strip()
            }
        for cells in cell_groups:
            for cell in cells:
                if cell.value is not None:
                    value = cell.value.isoformat() if isinstance(cell.value, (date, time)) else repr(cell.value)
                    header = headers.get(cell.column_letter) if header_row is not None and cell.row > header_row else None
                    label = f" [{header}]" if header else ""
                    yield f"{ws.title}!{cell.coordinate}{label}: {value}"
        for merged in sorted(str(r) for r in ws.merged_cells.ranges):
            yield f"{ws.title} merged: {merged}"
        for dv in ws.data_validations.dataValidation:
            yield f"{ws.title} validation {dv.sqref}: type={dv.type} formula1={dv.formula1}"
        for name in _sorted_names(ws.defined_names.values()):
            yield f"{ws.title} name {_format_name(name)}"
    for name in _sorted_names(wb.defined_names.values()):
        yield f"name {_format_name(name)}"


def main() -> int:
    """Print the text representation of the workbook given on the command line.

    Returns:
        0 on success, 1 on an unreadable file. A bad command line exits with code 2.
    """
    parser = argparse.ArgumentParser(description="Print an Excel workbook as text for `git diff`.")
    parser.add_argument("workbook", help="Path to the .xlsx or .xlsm file.")
    parser.add_argument("--by-column", action="store_true", help="Print cells column by column instead of row by row. "
                        "Add the header name of the column after the coordinate of each cell below the header row.")
    args = parser.parse_args()
    try:
        for line in dump_workbook(args.workbook, by_column=args.by_column):
            print(line)
    except Exception as e:
        print(f"xlsx_textconv: cannot read {args.workbook}: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

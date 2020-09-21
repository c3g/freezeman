from tablib import Dataset
from ..models import Container
from ..utils import str_normalize


__all__ = [
    "get_container_pk",
    "skip_rows",
    "remove_column_from_preview",
    "add_column_from_preview",
]


def get_container_pk(**query):
    try:
        return Container.objects.get(**query).pk
    except Container.DoesNotExist:
        raise Container.DoesNotExist(f"Container matching query {query} does not exist")


def skip_rows(dataset: Dataset, num_rows: int = 0, col_skip: int = 1) -> None:
    if num_rows <= 0:
        return
    dataset_headers = dataset[num_rows - 1]
    dataset_data = dataset[num_rows:]
    dataset.wipe()
    dataset.headers = dataset_headers
    for r in dataset_data:
        vals = set(("" if c is None else c) for c in r[col_skip:])
        if len(vals) == 1 and "" in vals:
            continue
        dataset.append(tuple(str_normalize(c) if isinstance(c, str) else ("" if c is None else c) for c in r))


def remove_column_from_preview(results, column_name: str):
    index_column = results.diff_headers.index(column_name)
    results.diff_headers.remove(column_name)
    for row in results.rows:
        if row.diff:
            row.diff.pop(index_column)
    return results


def add_column_from_preview(results, dataset, column_name: str, column_index: int = None):
    # Check if the column is already in the preview
    if column_name not in results.diff_headers:  # if absent,
        if not column_index:  # insert at column_index (there is 2 columns that are inserted by default)
            results.diff_headers.append(column_name)
            for cnt, row in enumerate(results.rows):
                if row.diff:
                    row.diff.append(dataset.dict[cnt][column_name])
        else:  # or insert at the end
            results.diff_headers.insert(column_index, column_name)
            index_column = column_index
            for cnt, row in enumerate(results.rows):
                if row.diff:
                    row.diff.insert(index_column, dataset.dict[cnt][column_name])
    else:  # If present, insert the values in the existing column
        index_column = results.diff_headers.index(column_name)
        for cnt, row in enumerate(results.rows):
            if row.diff:
                row.diff[index_column] = dataset.dict[cnt][column_name]
    return results

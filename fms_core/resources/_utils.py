from tablib import Dataset
from ..models import Container
from ..utils import str_normalize


__all__ = [
    "get_container_pk",
    "skip_rows",
    "remove_column_from_results",
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


def remove_column_from_results(column_name: str, results):
    index_column = results.diff_headers.index(column_name)
    results.diff_headers.remove(column_name)
    for row in results.rows:
        row.diff.pop(index_column)
    return results

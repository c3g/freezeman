from pandas import pandas as pd
from typing import Any

def data_row_ids_range(starting_row, df):
    return range(starting_row, len(df))

def panda_values_to_str_list(row_data):
    return ['' if x is None else str(x) for x in row_data.values.flatten().tolist()]

def blank_and_nan_to_none(s: Any):
    """
    Returns None if the argument is a nan (pandas) or a blank string, or the argument with no
    changes otherwise.
    """
    return None if (s == "" or pd.isnull(s)) else s
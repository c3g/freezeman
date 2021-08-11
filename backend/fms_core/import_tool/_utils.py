from pandas import pandas as pd
from typing import Any

def data_row_ids_range(starting_row, df):
    return range(starting_row, len(df.loc[starting_row:]))


def convert_property_value_to_str(val):
    return '' if pd.isnull(val) else str(val)


def blank_and_nan_to_none(s: Any):
    """
    Returns None if the argument is a nan (pandas) or a blank string, or the argument with no
    changes otherwise.
    """
    return None if (s == "" or pd.isnull(s))  else s
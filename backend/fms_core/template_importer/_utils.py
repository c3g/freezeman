from pandas import pandas as pd
from typing import Any
from fms_core.utils import float_to_decimal
import datetime

def float_to_decimal_and_none(val):
    return float_to_decimal(val) if val is not None else None

def input_to_date_and_none(date_input):
    if not date_input: 
        return None
    elif isinstance(date_input, (int, float)):
        return None
    elif isinstance(date_input, datetime.date):
        return date_input
    else:
        try:
            year, month, day = date_input.split("-")
            date = datetime.datetime(int(year), int(month), int(day))
        except ValueError:
            date = None
        return date

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
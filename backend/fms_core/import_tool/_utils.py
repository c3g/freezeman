from pandas import pandas as pd

def data_row_ids_range(starting_row, df):
    return range(starting_row, len(df.loc[starting_row:]))


def convert_property_value_to_str(val):
    return '' if pd.isnull(val) else str(val)

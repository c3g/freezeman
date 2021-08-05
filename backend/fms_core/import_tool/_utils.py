def data_row_ids_range(starting_row, df):
    return range(starting_row, len(df.loc[starting_row:]))
from ._utils import data_row_ids_range, panda_values_to_str_list

class SheetData():
    def __init__(self, dataframe, header_row_nb):
        self.dataframe = dataframe
        self.header_row_nb = header_row_nb
        self.base_errors = []

        self.dataframe.columns = self.dataframe.values[self.header_row_nb]

        self.prepare_rows()


    def prepare_rows(self):
        self.rows = []
        self.rows_results = []
        for row_id in data_row_ids_range(self.header_row_nb + 1, self.dataframe):
            row_data = self.dataframe.iloc[row_id]
            self.rows.append(row_data)

            result = {'diff': panda_values_to_str_list(row_data),
                      'errors': [],
                      'validation_error': None,
                      'warnings': [],
                      'import_type': 'new',
                      }
            self.rows_results.append(result)


    def is_valid(self):
        pass

    @property
    def headers(self):
        return self.dataframe.columns.tolist()

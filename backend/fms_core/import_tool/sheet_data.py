from django.core.exceptions import ValidationError
from ._utils import data_row_ids_range, panda_values_to_str_list

class SheetData():
    def __init__(self, dataframe, header_row_nb, minimum_required_columns):
        self.dataframe = dataframe
        self.header_row_nb = header_row_nb
        self.minimum_required_columns = minimum_required_columns

        self.base_errors = []
        self.is_valid = None

        self.dataframe.columns = self.dataframe.values[self.header_row_nb]

        self.prepare_rows()


    def prepare_rows(self):
        self.rows = []
        self.rows_results = []
        for row_id in data_row_ids_range(self.header_row_nb + 1, self.dataframe):
            row_data = self.dataframe.iloc[row_id]

            required_values = [row_data[key] for key in self.minimum_required_columns]
            if any(list(map(lambda x: x is None, required_values))):
                # Skipped row
                pass
            else:
                self.rows.append(row_data)

                result = {'diff': panda_values_to_str_list(row_data),
                          'errors': [],
                          'validation_error': ValidationError([]),
                          'warnings': [],
                          'import_type': 'new',
                          }
                self.rows_results.append(result)


    @property
    def headers(self):
        return self.dataframe.columns.tolist()


    def preview_info_for_rows_results(self, rows_results):
        has_row_errors = any((x['errors'] != [] or x['validation_error'].messages != []) for x in rows_results)
        self.is_valid = True if (len(self.base_errors) == 0 and not has_row_errors) else False

        return {
            "headers": self.headers,
            "valid": self.is_valid,
            "base_errors": self.base_errors,
            "rows": rows_results,
        }

from django.core.exceptions import ValidationError
from ._utils import data_row_ids_range, panda_values_to_str_list

'''
    SheetData objects
    attributes (input): 
        name, pandas dataframe, header row number

    preview info from rows results (output): 
        a dictionary with the sheet name, list of column headers, data sheet validity, 
                              list of base_errors, list of rows_results
'''


class SheetData():
    def __init__(self, name, dataframe, headers, is_partial_header):
        self.base_errors = []
        self.is_valid = None
        self.header_row_nb = None

        self.name = name
        self.dataframe = dataframe
        self.headers = headers

        if self.headers in self.dataframe.values.tolist():
            self.set_header_row(self.headers)
        elif is_partial_header:
            for row_list in self.dataframe.values.tolist():
                if set(row_list).issuperset(self.headers):
                    self.set_header_row(row_list)
                    break

        if self.header_row_nb:
            self.prepare_rows()
        else:
            self.base_errors.append(f"SheetData headers could not be found.")


    def set_header_row(self, header_row_list):
        self.dataframe.columns = header_row_list
        self.header_row_nb = self.dataframe.values.tolist().index(header_row_list)

    def prepare_rows(self):
        self.rows = []
        self.rows_results = []
        for row_id in data_row_ids_range(self.header_row_nb + 1, self.dataframe):
            row_data = self.dataframe.iloc[row_id]
            self.rows.append(row_data)

            row_repr = f"#{row_id + 2}"

            result = {
                'row_repr': row_repr,
                'diff': [row_repr] + panda_values_to_str_list(row_data),
                'errors': [],
                'validation_error': ValidationError([]),
                'warnings': [],
            }
            self.rows_results.append(result)


    def generate_preview_info_from_rows_results(self, rows_results):
        has_row_errors = any((x['errors'] != [] or x['validation_error'].messages != []) for x in rows_results)
        self.is_valid = True if (len(self.base_errors) == 0 and not has_row_errors) else False

        headers_for_preview = [''] + self.headers

        return {
            "name": self.name,
            "headers": headers_for_preview,
            "valid": self.is_valid,
            "base_errors": self.base_errors,
            "rows": rows_results,
        }
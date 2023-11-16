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
    def __init__(self, name, dataframe, headers):
        self.base_errors = []
        self.is_valid = None
        self.header_row_nb = None
        self.empty_row = None
        self.name = name
        self.dataframe = dataframe
        self.headers = headers

        for i, row_list in enumerate(self.dataframe.values.tolist()):
            if row_list[:len(self.headers)] == self.headers:
                self.dataframe.columns = row_list
                self.header_row_nb = i
                break

        if self.header_row_nb is not None:
            self.prepare_rows()
        else:
            self.base_errors.append(f"SheetData headers could not be found for sheet " + self.name + ". Template may be outdated.")


    def prepare_rows(self):
        self.rows = []
        self.rows_results = []
        for row_id in data_row_ids_range(self.header_row_nb + 1, self.dataframe):
            row_data = self.dataframe.iloc[row_id]
            self.rows.append(row_data)
            row = row_id + 1
            row_repr = f"#{row}"
            row_data = panda_values_to_str_list(row_data)

            result = {
                'row_repr': row_repr,
                'diff': [row_repr] + row_data,
                'errors': [],
                'validation_error': ValidationError([]),
                'warnings': [],
            }
            self.rows_results.append(result)
            
            #checks if entire row has missing data (empty cells)
            empty_row = row if self.check_for_empty_data_array(row_data) else ''
            if empty_row:
                self.empty_row = empty_row
        
        self.check_for_empty_row_errors()

    def generate_preview_info_from_rows_results(self, rows_results):
        has_row_errors = any((x['errors'] != [] or x['validation_error'].messages != []) for x in rows_results)
        self.is_valid = True if (len(self.base_errors) == 0 and not has_row_errors) else False

        # Add dynamic columns that might not be part of the hard coded headers
        extra_columns = [column for column in self.dataframe.columns if (column not in self.headers and column is not None)]
        headers_for_preview = [''] + self.headers + extra_columns

        return {
            "name": self.name,
            "headers": headers_for_preview,
            "valid": self.is_valid,
            "base_errors": self.base_errors,
            "rows": rows_results,
        }
    
    def check_for_empty_data_array(self,row_data):
        for x in (row_data):
            if x:
                return False
        return True
    
    def check_for_empty_row_errors(self):
        #checks if empty row exists in sheet_data, appends error with the last filled line in the sheet_data
        if self.empty_row:
            erroneous_row = self.empty_row + 1
            self.base_errors.append(f'Empty line detected. Fill in empty line at row #{str(self.empty_row)} or remove data at row #{str(erroneous_row)}.')
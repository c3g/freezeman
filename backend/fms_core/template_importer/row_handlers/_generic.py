from django.core.exceptions import ValidationError
from collections import defaultdict

'''
    RowHandler objects
    An object inheriting from RowHandler() should be created for each different 'type' of row 
    (the 'type' being determined by a unique combination of columns)

    process_row (input): 
        row data obtained from the Importer objects.
    get_result (output): 
        A row result dictionary containing errors, validation error, warnings, and row data 
'''


class GenericRowHandler():
    def __init__(self):
        self.errors = defaultdict(list)
        self.warnings = defaultdict(list)
        # optional - in case the Importer needs the current row main object from the RowHandler
        self.row_object = None

    def has_errors(self):
        has_errors = False
        for error in self.errors:
            has_errors = has_errors or bool(error)
        return has_errors

    def process_row(self, **kwargs):
        if not self.errors:
            self.process_row_inner(**kwargs)
        result = self.get_result()
        return result

    def get_result(self):
        warnings = []
        for (k, v) in (self.warnings).items():
            if v:
                warnings.append(f"{k} : {v}")
        return {'errors': [], 'validation_error': ValidationError(self.errors), 'warnings': warnings}
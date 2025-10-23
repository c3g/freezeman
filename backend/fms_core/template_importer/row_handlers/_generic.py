from django.core.exceptions import ValidationError
from collections import defaultdict

from fms_core.utils import Warnings, serialize_warnings

'''
    RowHandler objects
    An object inheriting from RowHandler() should be created for each different 'type' of row 
    (the 'type' being determined by a unique combination of columns)
    validate_input (input):
        verify that input provided by the user are compatible with the row handler operation.
        returns errors helpful to the user.
    process_row (input): 
        row data obtained from the Importer objects.
    get_result (output): 
        A row result dictionary containing errors, validation error, warnings, and row data 
'''


class GenericRowHandler():
    def __init__(self):
        self.errors = defaultdict(list)
        self.warnings: Warnings = defaultdict(list)
        # optional - in case the Importer needs the current row main object from the RowHandler
        self.row_object = None

    def validate_row_input(self, **kwargs):
        pass # no validation is done by default

    def has_errors(self):
        has_errors = False
        for error in self.errors.values():
            has_errors = has_errors or bool(error)
        return has_errors

    def process_row(self, **kwargs):
        if kwargs["is_empty_row"]:
            self.warnings["Template"] = f"Empty template row."
        elif not self.errors:
            kwargs.pop("is_empty_row")
            self.validate_row_input(**kwargs)
            self.process_row_inner(**kwargs)
        result = self.get_result()
        return result

    def get_result(self):
        warnings = serialize_warnings(self.warnings)
        return {'errors': [], 'validation_error': ValidationError(self.errors), 'warnings': warnings}
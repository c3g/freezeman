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

    def is_empty_row(self, **kwargs) -> bool:
        """
        Check if there is any useful data on a template row.

        returns a boolean
        """

        def _is_empty(kwargs) -> bool:
            is_empty = True
            if isinstance(kwargs, (list, set)):
                for value in kwargs:
                    is_empty = is_empty and _is_empty(value)
            elif isinstance(kwargs, dict):
                for value in kwargs.values():
                    is_empty = is_empty and _is_empty(value)
            else:
                is_empty = kwargs != 0 and not kwargs
            return is_empty
        
        return _is_empty(kwargs)

    def process_row(self, **kwargs):
        if self.is_empty_row(**kwargs["template_data"]):
            self.warnings["Empty Row"] = f"Empty template row."
        elif not self.errors:
            self.validate_row_input(**kwargs)
            self.process_row_inner(**kwargs)
        result = self.get_result()
        return result

    def get_result(self):
        warnings = serialize_warnings(self.warnings)
        return {'errors': [], 'validation_error': ValidationError(self.errors), 'warnings': warnings}
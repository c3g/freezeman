from django.core.exceptions import ValidationError

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
        self.errors = {}
        self.warnings = {}

        # optional - in case the Importer needs the current row main object from the RowHandler
        self.row_object = None

    def process_row(self, **kwargs):
        if self.errors == {}:
            self.process_row_inner(**kwargs)

        result = self.get_result()
        return result

    def get_result(self):

        warnings = []
        for (k, v) in (self.warnings).items():
            if v:
                warnings.append(f"{k} : {v}")

        return {'errors': [],
                'validation_error': ValidationError(self.errors),
                'warnings': warnings,
                }
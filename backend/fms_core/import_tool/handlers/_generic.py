from django.core.exceptions import ValidationError

class GenericHandler():
    errors = {}

    def __init__(self, **args):
        pass


    def get_result(self):
        validation_error = None
        if self.has_errors():
            validation_error = ValidationError(self.errors)
        row_dict = {'errors': [],
                    'validation_error': validation_error,
                    'warnings': [],
                    'import_type': 'new'}

        return row_dict


    def has_errors(self):
        return False if (self.errors == {}) else True
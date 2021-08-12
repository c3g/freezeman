from django.core.exceptions import ValidationError

class GenericRowHandler():
    def __init__(self, **kwargs):
        self.errors = {}


    def get_result(self):
        validation_error = None
        if self.has_errors():
            validation_error = ValidationError(self.errors)

        return {'errors': [],
                'validation_error': validation_error,
                'warnings': [],
                'import_type': 'new'}


    def has_errors(self):
        return False if (self.errors == {}) else True
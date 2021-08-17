from django.core.exceptions import ValidationError

class GenericRowHandler():
    def __init__(self, row_identifier):
        self.row_identifier = row_identifier
        self.errors = {}

    def process_row(self, **kwargs):
        pass

    def get_result(self):
        return {'errors': [],
                'validation_error': ValidationError(self.errors),
                'warnings': [],
                'import_type': 'new',
                'row_identifier': self.row_identifier}

    def has_errors(self):
        return True if any(a != [] for a in self.errors.values()) else True
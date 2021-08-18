from django.core.exceptions import ValidationError

'''
    RowHandler objects
    
    attributes (input): 
        row data obtained from the Importer objects.
    get_result (output): 
        A row result dictionary containing errors, validation error, warnings, and row data 
'''

class GenericRowHandler():
    def __init__(self, row_identifier):
        self.row_identifier = row_identifier
        self.row_object = None
        self.errors = {}

    def process_row(self, **kwargs):
        pass

    def get_result(self):
        print('ROW_HANDLER get_result errors', self.errors)
        return {'errors': [],
                'validation_error': ValidationError(self.errors),
                'warnings': [],
                'import_type': 'new',
                'row_identifier': self.row_identifier}

    def has_errors(self):
        return True if any(a != [] for a in self.errors.values()) else True
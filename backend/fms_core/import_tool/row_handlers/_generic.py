from django.core.exceptions import ValidationError

'''
    RowHandler objects
    
    process_row (input): 
        row data obtained from the Importer objects.
    get_result (output): 
        A row result dictionary containing errors, validation error, warnings, and row data 
'''

class GenericRowHandler():
    def __init__(self):
        # optional - in case the Importer needs the current row main object from the RowHandler
        self.row_object = None

        self.errors = {}


    def process_row(self, **kwargs):
        print('process row generic')
        if self.errors == {}:
            print('self errors == {}')
            self.process_row_inner(**kwargs)

        return self.get_result()


    def get_result(self):
        print('ROW_HANDLER get_result errors', self.errors)
        return {'errors': [],
                'validation_error': ValidationError(self.errors),
                'warnings': [],
                }


    def has_errors(self):
        return True if any(a != [] for a in self.errors.values()) else True
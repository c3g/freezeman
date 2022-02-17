from datetime import datetime

from fms_core.models import Index

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.index import get_or_create_index_set, create_index, create_indices_3prime_by_sequence,  create_indices_5prime_by_sequence


class IndexCreationHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, set_name, index):
        #get or create set
        index_set_obj, created, self.errors['index_set'], self.warnings['index_set'] = get_or_create_index_set(set_name)

        if not index_set_obj:
            self.warnings['index_set'] = f'Index will not be associated to a set.'
        elif not created:
            self.warnings['index_set'] = f'Using existing set {index_set_obj.name}.'

        #create index
        index_obj, self.errors['index'], self.warnings['index'] = create_index(index_name=index['name'],
                                                                               index_structure=index['index_structure'],
                                                                               index_set=index_set_obj)

        if index_obj:
            if any([index['index_3prime'], index['index_5prime']]):
                indices_3prime_by_sequence, self.errors['index_3prime'], self.warnings['index_3prime'] = \
                    create_indices_3prime_by_sequence(index=index_obj,
                                                      index_3prime=index['index_3prime'])

                indices_5prime_by_sequence, self.errors['index_5prime'], self.warnings['index_5prime'] = \
                    create_indices_5prime_by_sequence(index=index_obj,
                                                      index_5prime=index['index_5prime'])
            else:
                self.errors['index_sequences'] = 'At least one index sequence is required.'
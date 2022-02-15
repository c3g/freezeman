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

        if not created:
            self.warnings['index_set'] = f'Using existing set {index_set_obj.name}.'

        if index_set_obj:
            #create index
            index_obj, created, self.errors['index'], self.warnings['index'] = create_index(set=index_set_obj,
                                                                                            index_name=index['name'],
                                                                                            index_structure=index['index_structure'])

            if index_obj:
                indices_3prime_by_sequence, self.erros['indices_prime'], self.warnings['indices_prime'] = \
                    create_indices_3prime_by_sequence(index=index_obj,
                                               index_3prime=index['index_3prime'])

                indices_5prime_by_sequence, self.erros['indices_prime'], self.warnings['indices_prime'] = \
                    create_indices_5prime_by_sequence(index=index_obj,
                                               index_3prime=index['index_3prime'])









        pass
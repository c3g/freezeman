from fms_core.import_tool.row_handlers._generic import GenericRowHandler

class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, sample, container, parent_container, individual, individual_mother, individual_father):
        print('start sample row handler')

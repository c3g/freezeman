from datetime import datetime

from fms_core.models import Index

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

#services

class IndexCreationHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample, project, action):
        pass
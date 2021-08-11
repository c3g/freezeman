from pandas import pandas as pd
from django.db import transaction

class GenericImporter():
    base_errors = []
    global_data = {}

    def __init__(self, file, format):
        self.file = file
        self.format = format

        self.sheets = {}
        for name in self.sheet_names:
            try:
                self.sheets[name] = pd.read_excel(self.file, sheet_name=name)
            except Exception as e:
                self.base_errors.append(e)


    def import_template(self, dry_run):
        with transaction.atomic():
            import_result = self.import_template_inner()
            # result = import_result.copy()

            if dry_run:
                transaction.set_rollback(True)

            return import_result


    def import_global_data_from_template(self, **args):
        pass

    def is_empty_row(self, non_empty_values_list):
        return any(list(map(lambda x: x is None, non_empty_values_list)))




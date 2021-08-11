from pandas import pandas as pd
from django.db import transaction
from .._utils import blank_and_nan_to_none

class GenericImporter():
    base_errors = []
    global_data = {}

    def __init__(self):
        pass


    def import_template(self, file, format, dry_run):
        self.sheets = {}
        for name in self.sheet_names:
            try:
                sheet = pd.read_excel(file, sheet_name=name)
                # Convert blank and NaN cells to None and Store it in self.sheets
                self.sheets[name] = sheet.applymap(lambda x: blank_and_nan_to_none(x))
            except Exception as e:
                self.base_errors.append(e)


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




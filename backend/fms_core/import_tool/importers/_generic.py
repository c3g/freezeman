from pandas import pandas as pd
from django.db import transaction

from ..sheet_data import SheetData
from .._utils import blank_and_nan_to_none, data_row_ids_range

class GenericImporter():
    def __init__(self):
        self.base_errors = []
        self.preloaded_data = {}
        self.file = None
        self.sheets = {}
        self.previews_info = []


    def import_template(self, file, format, dry_run):
        self.file = file

        for sheet_info in self.SHEETS_INFO:
            sheet_name = sheet_info['name']
            self.sheets[sheet_name] = self.create_sheet_data(sheet_name=sheet_name,
                                                             header_row_nb=sheet_info['header_row_nb'],
                                                             minimum_required_columns=sheet_info['minimum_required_columns'])

        if len(self.base_errors) > 0:
            return [{"headers": [],
                     "valid": False,
                     "base_errors": self.base_errors,
                     "rows": [],
                     }]
        else:
            with transaction.atomic():
                import_result = self.import_template_inner()

                if dry_run:
                    transaction.set_rollback(True)

                return import_result


    def create_sheet_data(self, sheet_name, header_row_nb, minimum_required_columns):
        try:
            pd_sheet = pd.read_excel(self.file, sheet_name=sheet_name)
            # Convert blank and NaN cells to None and Store it in self.sheets
            dataframe = pd_sheet.applymap(lambda x: blank_and_nan_to_none(x))
            return SheetData(dataframe=dataframe,
                             header_row_nb=header_row_nb,
                             minimum_required_columns=minimum_required_columns)

        except Exception as e:
            self.base_errors.append(e)
            print('Importers/Generic create_sheet_data exception ', e)


    def preload_data_from_template(self, **kwargs):
        pass

    def preview_sheets_results(self):
        for (_, sheet_name) in enumerate(self.sheets):
            sheet = self.sheets[sheet_name]
            preview_info = sheet.preview_info_for_rows_results(rows_results=sheet.rows_results)
            self.previews_info.append(preview_info)

        return self.previews_info

    @property
    def is_valid(self):
        return len(self.base_errors) == 0 and all(s.is_valid == True for s in list(self.sheets.values()))

    def is_empty_row(self, non_empty_values_list):
        return any(list(map(lambda x: x is None, non_empty_values_list)))




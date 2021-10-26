from pandas import pandas as pd
from django.db import transaction
import reversion

from ..sheet_data import SheetData
from .._utils import blank_and_nan_to_none

class GenericImporter():
    ERRORS_CUTOFF = 20

    def __init__(self):
        self.base_errors = []
        self.errors_count = 0

        self.preloaded_data = {}
        self.file = None
        self.sheets = {}
        self.previews_info = []

    def import_template(self, file, format, dry_run):
        self.file = file

        for sheet_info in self.SHEETS_INFO:
            sheet_name = sheet_info['name']
            sheet_created = self.create_sheet_data(**sheet_info)

            if sheet_created.base_errors:
                self.base_errors += sheet_created.base_errors

            if sheet_created is not None:
                self.sheets[sheet_name] = sheet_created


        if not self.base_errors:
            with transaction.atomic():
                if dry_run:
                    # This ensures that only one reversion is created, and is rollbacked in a dry_run
                    with reversion.create_revision(manage_manually=True):
                        self.import_template_inner()
                        reversion.set_comment("Template import - dry run")
                    transaction.set_rollback(True)
                else:
                    self.import_template_inner()
                    reversion.set_comment("Template import")

            # Add processed rows with errors/warnings/diffs to self.previews_info list
            for sheet in list(self.sheets.values()):
                preview_info = sheet.generate_preview_info_from_rows_results(rows_results=sheet.rows_results)
                self.previews_info.append(preview_info)

        has_warnings = False
        for sheet_preview in self.previews_info:
            if any([r['warnings'] for r in sheet_preview['rows']]):
                has_warnings = True
                break

        import_result = {'valid': self.is_valid,
                         'has_warnings': has_warnings,
                         'base_errors': [{
                             "error": str(e),
                             } for e in self.base_errors],
                         'result_previews': self.previews_info,
                         }
        return import_result


    def create_sheet_data(self, name, headers):
        try:
            pd_sheet = pd.read_excel(self.file, sheet_name=name)
            # Convert blank and NaN cells to None and Store it in self.sheets
            dataframe = pd_sheet.applymap(blank_and_nan_to_none)
            return SheetData(name=name, dataframe=dataframe, headers=headers)

        except Exception as e:
            self.base_errors.append(e)
            return None


    def initialize_data_for_template(self, **kwargs):
        """
        Preloading data from template & template global data creation
        """
        pass

    def handle_row(self, row_handler_class, sheet, row_i, **kwargs):
        row_handler_obj = row_handler_class()
        result = row_handler_obj.process_row(**kwargs)
        sheet.rows_results[row_i].update(**result)

        if result['validation_error']:
            self.errors_count += 1

        if self.errors_count >= self.ERRORS_CUTOFF:
            raise ValueError('Too many errors. Template validation was stopped.')

        row_obj = row_handler_obj.row_object
        return (result, row_obj)


    @property
    def is_valid(self):
        if any(s.is_valid is None for s in list(self.sheets.values())):
            self.base_errors.append(f"Some data sheets were not validated yet. "
                                    f"Importer property is_valid can only be obtained after all its sheets are validated.")
            return False

        else:
            return len(self.base_errors) == 0 and all(s.is_valid == True for s in list(self.sheets.values()))
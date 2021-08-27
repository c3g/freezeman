from pandas import pandas as pd
from django.db import transaction
import reversion

from ..sheet_data import SheetData
from .._utils import blank_and_nan_to_none

class GenericImporter():
    def __init__(self):
        self.base_errors = []
        self.preloaded_data = {}
        self.file = None
        self.sheets = {}
        self.previews_info = []

        print('Generic Importer - __init__ successful')


    def import_template(self, file, format, dry_run):
        self.file = file

        print('file', file)

        for sheet_info in self.SHEETS_INFO:
            sheet_name = sheet_info['name']
            print('sheet_name', sheet_name)
            sheet_created = self.create_sheet_data(sheet_name=sheet_name,
                                                   header_row_nb=sheet_info['header_row_nb'],
                                                   minimally_required_columns=sheet_info['minimally_required_columns'])

            if sheet_created is not None:
                self.sheets[sheet_name] = sheet_created

        print('sheets')


        if len(self.base_errors) == 0:
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


        import_result = {'valid': self.is_valid,
                         # 'has_warnings': any([r['warnings'] for r in result['rows']]),
                         'base_errors': [{
                             "error": str(e),
                             } for e in self.base_errors],
                         'result_previews': self.previews_info,
                         }
        return import_result


    def create_sheet_data(self, sheet_name, header_row_nb, minimally_required_columns):
        try:
            pd_sheet = pd.read_excel(self.file, sheet_name=sheet_name)
            # Convert blank and NaN cells to None and Store it in self.sheets
            dataframe = pd_sheet.applymap(lambda x: blank_and_nan_to_none(x))
            return SheetData(name=sheet_name,
                             dataframe=dataframe,
                             header_row_nb=header_row_nb,
                             minimally_required_columns=minimally_required_columns)

        except Exception as e:
            self.base_errors.append(e)
            print('Importers/Generic create_sheet_data exception ', e)
            return None


    def preload_data_from_template(self, **kwargs):
        pass

    @property
    def is_valid(self):
        if any(s.is_valid is None for s in list(self.sheets.values())):
            raise Exception(f"Some data sheets were not validated yet. "
                            f"Importer property is_valid can only be obtained after all its sheets are validated.")
        else:
            return len(self.base_errors) == 0 and all(s.is_valid == True for s in list(self.sheets.values()))




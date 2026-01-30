from io import BytesIO, StringIO
from pathlib import Path
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.conf import settings
import pandas as pd
from django.db import transaction
import time
import reversion
import os
import json

from ..sheet_data import SheetData
from .._utils import blank_and_nan_to_none
from fms_core.utils import str_normalize
from fms_core.models import ImportedFile
from fms_core.templates import SheetInfo

class BytesIOWithName(BytesIO):
    def __init__(self, name, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.name = name

class GenericImporter():
    ERRORS_CUTOFF = 20

    def __init__(self):
        self.base_errors = []
        self.errors_count = 0

        self.preloaded_data = {}
        self.file = None
        self.format = None
        self.imported_file = None
        self.sheets = {}
        self.previews_info = []
        self.dry_run = None
        self.output_file = None

        # self.SHEETS_INFO is expected to be defined in child classes
        self.SHEETS_INFO: list[SheetInfo] = self.SHEETS_INFO

    def import_template(self, file: Path | InMemoryUploadedFile | BytesIOWithName, dry_run, user = None):
        self.file = file
        self.dry_run = dry_run
        file_name, file_format = os.path.splitext(file.name)
        self.format = file_format
        file_path = None

        if not (self.format == ".xlsx" or self.format == ".json") and len(self.SHEETS_INFO) > 1:
            self.base_errors.append(f"Templates with multiple sheets need to be submitted as xlsx files.")
        else:
            for sheet_info in self.SHEETS_INFO:
                sheet_name = sheet_info['name']
                sheet_created = self.create_sheet_data(name=sheet_name, headers=sheet_info["headers"] )

                if sheet_created is not None and sheet_created.base_errors:
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
                    # Save template on disk with modified name (append timestamp and id) and insert path in imported_file
                    if user is not None:
                        os.environ["TZ"] = settings.LOCAL_TZ
                        time.tzset()
                        new_file_name = f"{file_name}_{time.strftime('%Y-%m-%d_%H-%M-%S')}_{user.username}{file_format}"
                        file_path = os.path.join(settings.TEMPLATE_UPLOAD_PATH, new_file_name)
                        try:
                            self.imported_file = ImportedFile.objects.create(filename=new_file_name, location=file_path, created_by_id=user.id)
                        except Exception as err:
                            self.base_errors.append(err)
                    self.import_template_inner()                            
                    reversion.set_comment("Template import")

            # Add processed rows with errors/warnings/diffs to self.previews_info list
            for sheet in list(self.sheets.values()):
                preview_info = sheet.generate_preview_info_from_rows_results(rows_results=sheet.rows_results)
                self.previews_info.append(preview_info)

            # If user is None, file_path remains None and file is not saved on server.
            # This case is useful for tests because that's the only time self.file
            # is a Path object instead of an InMemoryUploadedFile.

            # Save the template on the server if the template is valid.
            if self.is_valid and file_path is not None:
                try:  # Submission is rolled back by request transaction on failure. Inform the users to contact support.
                    with open(file_path, "xb") as output:
                        # self.file is always an InMemoryUploadedFile in this case
                        # as user should be not None
                        for line in self.file: # type: ignore
                            output.write(line)
                except Exception as Err: # Either same file name already exists (unlikely) or lack of disk space (more likely)
                    self.base_errors.append(f"Could not save the template on server. Operation aborted. Contact support.")

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
                         'output_file': self.output_file
                         }
        return import_result

    def create_sheet_data(self, name, headers):
        try:
            shared_data = None
            if self.format == ".json":
                with open(self.file, 'r') as file:
                    file_content = file.read()
                json_content = json.loads(file_content)
                sheet_data = StringIO(json.dumps(json_content["datasheets"][name]["sheet_data"]))
                shared_data = json_content["datasheets"][name].get("shared_data", {})
                pd_sheet = pd.read_json(sheet_data, orient="records")
            elif self.format == ".xlsx":
                pd_sheet = pd.read_excel(self.file, sheet_name=name, header=None)
            elif self.format == ".csv" or self.format == ".txt" or self.format == ".asc":
                pd_sheet = pd.read_csv(self.file, header=None)
            elif self.format == ".tsv":
                pd_sheet = pd.read_csv(self.file, sep="\t", header=None)
            else:
                self.base_errors.append(f"Template file format " + self.format + " not supported.")
                return None
            # Convert blank and NaN cells to None and Store it in self.sheets
            dataframe = pd_sheet.map(blank_and_nan_to_none).map(str_normalize)
            return SheetData(name=name, dataframe=dataframe, headers=headers, shared_data=shared_data)

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
        if self.errors_count >= self.ERRORS_CUTOFF:
            result = {'errors': [], 'validation_error': ValidationError({}), 'warnings': []} # Skip row handling, report no error
        else:
            is_empty_row = not any(sheet.rows[row_i])
            result = row_handler_obj.process_row(is_empty_row=is_empty_row, **kwargs)

            if result['validation_error'].messages:
                self.errors_count += 1
                if self.errors_count >= self.ERRORS_CUTOFF:
                    result = {'errors': [], 'validation_error': ValidationError({"Too many errors": f"Template validation interrupted."}), 'warnings': []}

        sheet.rows_results[row_i].update(**result)
        row_obj = row_handler_obj.row_object
        return (result, row_obj)

    @property
    def is_valid(self):
        if any(s.is_valid is None for s in list(self.sheets.values())):
            self.base_errors.append(f"Some data sheets were not validated or recognized. "
                                    f"Importer property is_valid can only be obtained after all its sheets are validated.")
            return False

        else:
            return len(self.base_errors) == 0 and all(s.is_valid == True for s in list(self.sheets.values()))
    
    def import_template_inner(self):
        raise NotImplementedError("import_template_inner must be implemented in child classes")

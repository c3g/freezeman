import tablib
import os
import time
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.utils.encoding import force_str
from import_export.admin import ImportMixin, ExportActionMixin, ExportMixin
from import_export.formats.base_formats import CSV, TablibFormat
from reversion.admin import VersionAdmin
from .models import ImportedFile


__all__ = [
    "CustomImportMixin",
    "AggregatedAdmin",
]


def padded_nones(list_to_pad: list, padded_length: int) -> list:
    return [*list_to_pad, *([None] * max(padded_length - len(list_to_pad), 0))]


class PaddedXLSX(TablibFormat):
    TABLIB_MODULE = 'tablib.formats._xlsx'
    CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    def create_dataset(self, in_stream, **kwargs):
        """
        Create dataset from first sheet.
        """
        from io import BytesIO
        import openpyxl
        xlsx_book = openpyxl.load_workbook(BytesIO(in_stream), read_only=True)

        dataset = tablib.Dataset()
        sheet = xlsx_book.active

        # obtain generator
        rows = sheet.rows

        headers = [cell.value for cell in next(rows)]
        max_dim = len(headers)
        row_values = []

        for row in rows:
            row_value = [cell.value for cell in row]
            max_dim = max(max_dim, len(row_value))
            row_values.append(row_value)

        dataset.headers = padded_nones(headers, max_dim)
        dataset.extend([padded_nones(r, max_dim) for r in row_values])

        return dataset


class CustomImportMixin(ImportMixin):
    formats = [CSV, PaddedXLSX]
    change_list_template = "admin/fms_core/download_import.html"

    def process_import(self, request, *args, **kwargs):
        """
        Perform the actual import action (after the user has confirmed the import)
        """
        if not self.has_import_permission(request):
            raise PermissionDenied

        form_type = self.get_confirm_import_form()
        confirm_form = form_type(request.POST)
        if confirm_form.is_valid():
            import_formats = self.get_import_formats()
            input_format = import_formats[
                int(confirm_form.cleaned_data['input_format'])
            ]()
            tmp_storage = self.get_tmp_storage_class()(name=confirm_form.cleaned_data['import_file_name'])
            data = tmp_storage.read(input_format.get_read_mode())
            if not input_format.is_binary() and self.from_encoding:
                data = force_str(data, self.from_encoding)
            new_path = os.path.join(settings.MEDIA_ROOT, 'uploads/')
            dataset = input_format.create_dataset(data)
            time_string = time.strftime("%Y%m%d-%H%M%S")
            get_user_name = request.user.username
            new_file_name = confirm_form.cleaned_data['original_file_name'].split('.xlsx')[0]\
                            + time_string +f"_{get_user_name}" + '.xlsx'
            file_path = os.path.join(new_path, new_file_name)
            with open(file_path, 'wb') as f_output:
                f_output.write(dataset.xlsx)
                imf = ImportedFile.objects.create(filename=new_file_name)
                print(imf.__dict__)

            result = self.process_dataset(dataset, confirm_form, request, *args, **kwargs)

            tmp_storage.remove()

            return self.process_result(result, request)


class AggregatedAdmin(CustomImportMixin, ExportActionMixin, ExportMixin, VersionAdmin):
    """
    Import, Export and Version admin.
    """
    change_list_template = "admin/fms_core/change_list_import_export_version.html"
    import_template_name = "admin/fms_core/import.html"

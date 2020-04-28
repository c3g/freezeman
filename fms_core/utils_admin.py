# Copyright (c) Bojan Mihelac and individual contributors.
# Portions copyright (c) the Royal Institution for the Advancement of Learning /
# McGill University 2020.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without modification,
# are permitted provided that the following conditions are met:
#
#     1. Redistributions of source code must retain the above copyright notice,
#        this list of conditions and the following disclaimer.
#
#     2. Redistributions in binary form must reproduce the above copyright
#        notice, this list of conditions and the following disclaimer in the
#        documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
# ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import tablib
import os
import time
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.utils.decorators import method_decorator
from django.utils.encoding import force_str
from django.views.decorators.http import require_POST
from import_export.admin import ImportMixin, ExportActionMixin, ExportMixin
from import_export.formats.base_formats import CSV, TablibFormat
from reversion.admin import VersionAdmin
from .models import ImportedFile


__all__ = [
    "CustomImportMixin",
    "AggregatedAdmin",
]


UPLOADS_PATH = os.path.join(settings.MEDIA_ROOT, 'uploads/')


def padded_nones(list_to_pad: list, padded_length: int) -> list:
    return [*list_to_pad, *([None] * max(padded_length - len(list_to_pad), 0))]


TABLIB_CSV = 'tablib.formats._csv'
TABLIB_XLSX = 'tablib.formats._xlsx'


class PaddedXLSX(TablibFormat):
    TABLIB_MODULE = TABLIB_XLSX
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


# noinspection DuplicatedCode
class CustomImportMixin(ImportMixin):
    formats = [CSV, PaddedXLSX]
    change_list_template = "admin/fms_core/download_import.html"

    @method_decorator(require_POST)
    def process_import(self, request, *args, **kwargs):
        """
        Perform the actual import action (after the user has confirmed the import)
        Adapted from django-import-export ImportMixin method
        """

        if not self.has_import_permission(request):
            raise PermissionDenied

        form_type = self.get_confirm_import_form()
        confirm_form = form_type(request.POST)

        if confirm_form.is_valid():
            import_formats = self.get_import_formats()
            input_format = import_formats[int(confirm_form.cleaned_data['input_format'])]()
            tmp_storage = self.get_tmp_storage_class()(name=confirm_form.cleaned_data['import_file_name'])

            data = tmp_storage.read(input_format.get_read_mode())
            if not input_format.is_binary() and self.from_encoding:
                data = force_str(data, self.from_encoding)

            dataset = input_format.create_dataset(data)

            # save imported file to a folder
            as_xlsx = input_format.TABLIB_MODULE == TABLIB_XLSX
            file_name, _ = os.path.splitext(confirm_form.cleaned_data['original_file_name'])
            new_file_name = (f"{file_name}_{time.strftime('%Y%m%d-%H%M%S')}_{request.user.username}"
                             f".{'xlsx' if as_xlsx else 'csv'}")
            file_path = os.path.join(UPLOADS_PATH, new_file_name)

            # Save file, saving / coverting to CSV if not XLSX
            with open(f"{file_path}", "wb" if as_xlsx else "w") as f_output:
                f_output.write(dataset.export("xlsx" if as_xlsx else "csv"))
                # save record about file to db
                ImportedFile.objects.create(filename=new_file_name, location=file_path, imported_by=request.user)

            result = self.process_dataset(dataset, confirm_form, request, *args, **kwargs)
            tmp_storage.remove()

            return self.process_result(result, request)


class AggregatedAdmin(CustomImportMixin, ExportActionMixin, ExportMixin, VersionAdmin):
    """
    Import, Export and Version admin.
    """
    change_list_template = "admin/fms_core/change_list_import_export_version.html"
    import_template_name = "admin/fms_core/import.html"

import tablib
from import_export.admin import ImportMixin, ExportMixin
from import_export.formats.base_formats import CSV, TablibFormat
from reversion.admin import VersionAdmin


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


class AggregatedAdmin(CustomImportMixin, ExportMixin, VersionAdmin):
    """
    Import, Export and Version admin.
    """
    change_list_template = "admin/fms_core/change_list_import_export_version.html"
    import_template_name = "admin/fms_core/import.html"

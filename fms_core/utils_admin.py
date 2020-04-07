from import_export.admin import ImportMixin, ExportMixin
from reversion.admin import VersionAdmin


class AggregatedAdmin(ImportMixin, ExportMixin, VersionAdmin):
    """
    Import, Export and Version admin.
    """
    # template for change_list view
    change_list_template = 'change_list_import_export_version.html'
import reversion

from import_export import resources
from reversion.models import Version


class GenericResource(resources.ModelResource):
    clean_model_instances = True
    skip_unchanged = True
    ERROR_CUTOFF = 100
    errorCount = 0

    def save_instance(self, instance, using_transactions=True, dry_run=False):
        if dry_run:
            with reversion.create_revision(manage_manually=True):
                # Prevent reversion from saving on dry runs by manually overriding the current revision
                super().save_instance(instance, using_transactions, dry_run)
                return

        super().save_instance(instance, using_transactions, dry_run)

    def after_save_instance(self, instance, using_transactions, dry_run):
        if not dry_run:
            versions = Version.objects.get_for_object(instance)
            reversion.set_comment("Updated from template." if len(versions) >= 1 else "Imported from template.")

    def after_import_row(self, row, row_result, row_number=None, **kwargs):
        self.errorCount += (len(row_result.errors[0]) + len(row_result.validation_error)

    def import_row(self, row, instance_loader, using_transactions=True, dry_run=False, raise_errors=False, **kwargs):
        if self.errorCount < ERROR_CUTOFF:
            super().import_row(row, instance_loader, using_transactions, dry_run, raise_errors, **kwargs)

    def after_import(self, dataset, result, using_transactions, dry_run, **kwargs):
        if self.errorCount >= ERROR_CUTOFF:
            raise Exception("Too many errors. Interrupted processing.")
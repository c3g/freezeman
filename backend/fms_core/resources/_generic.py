import reversion

from import_export import resources
from import_export.results import RowResult
from django.core.exceptions import ValidationError
from reversion.models import Version


class GenericResource(resources.ModelResource):
    ERROR_CUTOFF = 20
    error_count = 0
    fields_manually_excluded = []
    row_warnings = []

    class Meta:
        clean_model_instances = True
        skip_unchanged = False

    def validate_instance(self, instance, import_validation_errors=None, validate_unique=True):
        """
        This method replaces the base class altogether in order to introduce a way to ignore manually some errors raised.
        """
        if import_validation_errors is None:
            errors = {}
        else:
            errors = import_validation_errors.copy()
        if self._meta.clean_model_instances:
            try:
                instance.full_clean(
                    exclude=self.fields_manually_excluded + list(errors.keys()),
                    validate_unique=validate_unique,
                )
            except ValidationError as e:
                errors = e.update_error_dict(errors)
                
        self.fields_manually_excluded = []
        if errors:
            raise ValidationError(errors)


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

    def import_row(self, row, instance_loader, using_transactions=True, dry_run=False, raise_errors=False, **kwargs):
        self.row_warnings = []
        if self.error_count < self.ERROR_CUTOFF:
            row_result = super().import_row(row, instance_loader, using_transactions, dry_run, raise_errors, **kwargs)

            error_count = 0
            if row_result.errors:
                error_count = 1 if type(row_result.errors[0]) is not list else len(row_result.errors[0])

            validation_error_count = 0
            if row_result.validation_error:
              for field in row_result.validation_error:
                  validation_error_count += len(field[1])
            self.error_count += (error_count + validation_error_count)

            row_result.warnings = self.row_warnings.copy()
        else:
            row_result = self.get_row_result_class()()
            row_result.import_type = RowResult.IMPORT_TYPE_SKIP
        return row_result

    def after_import(self, dataset, result, using_transactions, dry_run, **kwargs):
       if self.error_count >= self.ERROR_CUTOFF:
            raise Exception("Too many errors. Processing interrupted.")
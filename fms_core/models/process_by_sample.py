import reversion

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from ._utils import add_error as _add_error

from .process import Process
from .sample import Sample

__all__ = ["ProcessBySample"]


@reversion.register()
class ProcessBySample(models.Model):
    process = models.ForeignKey(Process, on_delete=models.PROTECT, related_name="process_by_sample", help_text="Process")
    sample = models.ForeignKey(Sample, on_delete=models.PROTECT, related_name="process_by_sample", help_text="Sample")
    execution_date = models.DateField(default=timezone.now, help_text="Date of execution of the process.")
    volume_used = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True,
                                      help_text="Volume of the sample used, in µL.")
    comment = models.TextField(blank=True, help_text="Relevant information about the process info.")


    def clean(self):
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object

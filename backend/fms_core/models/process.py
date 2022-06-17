import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .protocol import Protocol
from .imported_file import ImportedFile

from ._utils import add_error as _add_error

__all__ = ["Process"]


@reversion.register()
class Process(TrackedModel):
    parent_process = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name="child_process",
                                       help_text="Process in which this sub-process is contained")
    protocol = models.ForeignKey(Protocol, on_delete=models.PROTECT, related_name="processes", help_text="Protocol")
    imported_template = models.ForeignKey(ImportedFile, blank=True, null=True,
                                          on_delete=models.PROTECT,
                                          help_text="Template used for submission.")
    comment = models.TextField(blank=True, help_text="Relevant information about the process.")

    def __str__(self):
        return f"{self.id} ( protocol: {self.protocol.name})"

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object

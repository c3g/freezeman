import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .protocol import Protocol

from ._utils import add_error as _add_error

__all__ = ["Process"]


@reversion.register()
class Process(TrackedModel):
    protocol = models.ForeignKey(Protocol, on_delete=models.PROTECT, related_name="processes", help_text="Protocol")
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

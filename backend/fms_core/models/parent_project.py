import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from ._utils import add_error as _add_error

__all__ = ["ParentProject"]

@reversion.register()
class ParentProject(TrackedModel):
    external_id = models.CharField(max_length=200, unique=True, help_text="Identifier to connect to an external system.")
    name = models.CharField(max_length=200, help_text="Parent project name used by external client.")

    class Meta:
        indexes = [
            models.Index(fields=['external_id'], name='parentproject_externalid_idx'),
            models.Index(fields=['name'], name='parentproject_name_idx'),
        ]
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

    def __str__(self):
        return '%s: %s' % (self.external_id, self.name)
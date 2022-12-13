import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["LibrarySelection"]

@reversion.register()
class LibrarySelection(TrackedModel):
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the library selection protocol.")
    target = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                              help_text="The target of the selection protocol.")
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["name", "target"], name="libraryselection_name_target_key")
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
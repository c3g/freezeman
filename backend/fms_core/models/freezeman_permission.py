from django.db import models
from django.core.exceptions import ValidationError
import reversion

from .tracked_model import TrackedModel
from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._utils import add_error as _add_error
from ._validators import name_validator

@reversion.register()
class FreezemanPermission(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator], help_text="Name given as identifier to a permission.")
    description = models.TextField(help_text="Short description of the permission.")

    class Meta:
        indexes = [
            models.Index(fields=['name'], name='freezemanpermission_name_idx'),
        ]

    def __str__(self):
        return self.name
    
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
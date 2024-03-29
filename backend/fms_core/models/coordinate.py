import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from ._constants import STANDARD_COORDINATE_NAME_FIELD_LENGTH
from ._validators import coordinate_name_validator
from ._utils import add_error as _add_error

__all__ = ["Coordinate"]


@reversion.register()
class Coordinate(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_COORDINATE_NAME_FIELD_LENGTH,
                            help_text="Unique alphanumeric name to identify a coordinate in a container.",
                            validators=[coordinate_name_validator])
    column = models.PositiveIntegerField(help_text="Numeric value of the container coordinate column.")
    row = models.PositiveIntegerField(help_text="Numeric value of the container coordinate row.")

    class Meta:
        indexes = [
            models.Index(fields=['name'], name='coordinate_name_idx'),
        ]
    
    def __str__(self) -> str:
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
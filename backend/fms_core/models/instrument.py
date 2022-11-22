import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .instrument_type import InstrumentType

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["Instrument"]


@reversion.register()
class Instrument(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="Unique name for the instrument instance.",
                            validators=[name_validator])
    type = models.ForeignKey(InstrumentType, on_delete=models.PROTECT, related_name="instruments", help_text="Instrument type")
    serial_id = models.CharField(unique=True, max_length=200, help_text="Internal identifier for the instrument.")

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
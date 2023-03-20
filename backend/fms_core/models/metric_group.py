import reversion

from django.core.exceptions import ValidationError
from django.db import models
from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

__all__ = ["MetricGroup"]


@reversion.register()
class MetricGroup(TrackedModel):
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name for a grouping of metrics.")

    def __str__(self):
        return self.name

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
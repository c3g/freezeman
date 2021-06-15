import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._utils import add_error as _add_error

__all__ = ["InstrumentType"]


@reversion.register()
class InstrumentType(TrackedModel):
    type = models.CharField(unique=True,
                            max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="The product make. Acceptable values are listed at the ENA: https:\/\/ena-docs.readthedocs.io/en/latest/submit/reads/webin-cli.html?highlight=library_strategy#permitted-values-for-instrument")

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
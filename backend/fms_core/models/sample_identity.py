import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from ._utils import add_error as _add_error
from ._constants import SEX_CHOICES

__all__ = ["SampleIdentity"]

@reversion.register()
class SampleIdentity(TrackedModel):
    predicted_sex = models.CharField(null=True, blank=True, choices=SEX_CHOICES, max_length=10, help_text="Sex of the sample.")
    passed_qc = models.BooleanField(default=False, help_text="Flag indicating if the identity qc was conclusive.")

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
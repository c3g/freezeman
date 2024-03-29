import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .step import Step

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator_with_spaces_and_parentheses
from ._utils import add_error as _add_error

__all__ = ["Workflow"]


@reversion.register()
class Workflow(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Worflow name.", validators=[name_validator_with_spaces_and_parentheses])
    structure = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Worflow structure.", validators=[name_validator_with_spaces_and_parentheses])
    steps = models.ManyToManyField(Step, blank=True, through="StepOrder", symmetrical=False, related_name="workflows")

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
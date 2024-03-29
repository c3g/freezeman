import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .step import Step

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator, name_validator_with_spaces
from ._utils import add_error as _add_error

__all__ = ["StepSpecification"]


@reversion.register()
class StepSpecification(TrackedModel):
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name used to describe the value.", validators=[name_validator])
    sheet_name = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name of the step template sheet.", validators=[name_validator_with_spaces])
    column_name = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name of the step template column.", validators=[name_validator_with_spaces])
    step = models.ForeignKey(Step, on_delete=models.PROTECT, related_name="step_specifications", help_text="The step of the step specification.")
    value = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Value of the step specification", validators=[name_validator_with_spaces])

    def __str__(self):
        return self.value

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        # Ensure that sheet_name and column_name are only empty when the there is no protocol attached to the step (automation)
        if self.sheet_name is None and self.step.protocol is not None:
            add_error("sheet_name", f"Sheet name is required to define a protocol step specification.")
        if self.column_name is None and self.step.protocol is not None:
            add_error("column_name", f"Column name is required to define a protocol step specification.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
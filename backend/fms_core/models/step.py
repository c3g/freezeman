import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .protocol import Protocol

from ._constants import STANDARD_NAME_FIELD_LENGTH, SampleType, StepType
from ._validators import name_validator_with_spaces_and_parentheses
from ._utils import add_error as _add_error

__all__ = ["Step"]


@reversion.register()
class Step(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Step name.", validators=[name_validator_with_spaces_and_parentheses])
    protocol = models.ForeignKey(Protocol, null=True, blank=True, on_delete=models.PROTECT, related_name="steps", help_text="Protocol for the step.")
    expected_sample_type = models.CharField(choices=SampleType.choices, default=SampleType.ANY, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="The acceptable sample type for the step.")
    type = models.CharField(choices=StepType.choices, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Type of step.")
    needs_placement = models.BooleanField(default=True, help_text="Samples on this step need a destination container and coordinates assigned.")
    needs_planning = models.BooleanField(default=False, help_text="Step has a planning template to fill before the main template.")

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if (self.type == StepType.PROTOCOL and self.protocol is None):
            add_error("protocol", f"Protocol step {self.name} needs a reference to its protocol.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
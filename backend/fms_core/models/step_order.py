import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .step import Step
from .workflow import Workflow

from ._utils import add_error as _add_error

__all__ = ["StepOrder"]


@reversion.register()
class StepOrder(TrackedModel):
    step = models.ForeignKey(Step, on_delete=models.PROTECT, related_name="StepsOrder", help_text="The step of the step order.")
    next_step_order = models.ForeignKey("self", on_delete=models.PROTECT, related_name="PreviousStepOrder", help_text="The next step following the one defined here.")
    order = models.PositiveIntegerField(help_text="Ordinal value of the step in the workflow (starting at 1).")
    workflow = models.ForeignKey(Workflow, on_delete=models.PROTECT, related_name="StepsOrder", help_text="Workflow of the step order.")

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
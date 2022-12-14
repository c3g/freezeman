import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .step import Step
from .sample import Sample
from .study import Study

from ._utils import add_error as _add_error

__all__ = ["SampleNextStep"]


@reversion.register()
class SampleNextStep(TrackedModel):
    step = models.ForeignKey(Step, on_delete=models.PROTECT, related_name="SampleNextStep", help_text="The next step a sample has to complete in the study.")
    sample = models.ForeignKey(Sample, on_delete=models.PROTECT, related_name="SampleNextStep", help_text="The sample queued to the workflow.")
    study = models.ForeignKey(Study, on_delete=models.PROTECT, related_name="SampleNextStep", help_text="The study using the workflow that is followed by the sample.")

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
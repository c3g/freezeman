import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .step_order import StepOrder
from .sample import Sample
from .study import Study

from ._utils import add_error as _add_error

__all__ = ["SampleNextStep"]


@reversion.register()
class SampleNextStep(TrackedModel):
    step_order = models.ForeignKey(StepOrder, null=True, blank=True, on_delete=models.PROTECT, related_name="sample_next_step", help_text="The next step a sample has to complete in the study.")
    sample = models.ForeignKey(Sample, on_delete=models.PROTECT, related_name="sample_next_step", help_text="The sample queued to the workflow.")
    studies = models.ManyToManyField("Study", blank=True, through="SampleNextStepByStudy", symmetrical=False, related_name="sample_next_steps")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["step_order_id", "sample_id"], name="samplenextstep_steporderid_sampleid_key")
        ]

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
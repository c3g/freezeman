import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .step_order import Step
from .sample import Sample
from .study import Study
from ._constants import SampleType

from ._utils import add_error as _add_error

__all__ = ["SampleNextStep"]


@reversion.register()
class SampleNextStep(TrackedModel):
    step = models.ForeignKey(Step, on_delete=models.PROTECT, related_name="samples_next_step", help_text="The next step a sample has to complete in the study.")
    sample = models.ForeignKey(Sample, on_delete=models.PROTECT, related_name="sample_next_steps", help_text="The sample queued to workflows.")
    studies = models.ManyToManyField("Study", blank=True, through="SampleNextStepByStudy", symmetrical=False, related_name="samples_next_steps")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["step_id", "sample_id"], name="samplenextstep_stepid_sampleid_key")
        ]

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        # Validate that the sample belong on the step
        if not self.sample.matches_sample_type(self.step.expected_sample_type):
            add_error("expected_sample_type", f"Sample {self.sample.name} cannot be queued to the step {self.step.name} which expect {SampleType[self.step.expected_sample_type].label}")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
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
    step_order = models.ForeignKey(StepOrder, null=True, blank=True, on_delete=models.PROTECT, related_name="SampleNextStep", help_text="The next step a sample has to complete in the study.")
    sample = models.ForeignKey(Sample, on_delete=models.PROTECT, related_name="SampleNextStep", help_text="The sample queued to the workflow.")
    study = models.ForeignKey(Study, on_delete=models.PROTECT, related_name="SampleNextStep", help_text="The study using the workflow that is followed by the sample.")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["step_order", "sample", "study"], name="samplenextstep_steporder_sample_study_key")
        ]

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.step_order is not None and self.study is not None and (self.step_order.order > self.study.end or self.step_order.order < self.study.start):
            add_error("step_order", f"Step order for the sample in the workflow is invalid. The order must be between {self.study.start} and {self.study.end}.")

        if self.sample and not self.sample.is_pool and self.study.project != self.sample.derived_sample_not_pool.project:
            add_error("project", f"Samples and libraries in studies must be associated to the same project unless they are pools.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
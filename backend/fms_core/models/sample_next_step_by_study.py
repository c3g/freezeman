import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel
from .derived_sample import DerivedSample

from ._utils import add_error as _add_error

__all__ = ["SampleNextStepByStudy"]


@reversion.register()
class SampleNextStepByStudy(TrackedModel):
    study = models.ForeignKey("Study", on_delete=models.PROTECT, related_name="sample_next_step_by_study",
                              help_text='Study associated to the sample next step instance.')
    step_order = models.ForeignKey("StepOrder", on_delete=models.PROTECT, related_name="sample_next_step_by_study",
                                   help_text='Step order for the sample queued to a given study.')
    sample_next_step = models.ForeignKey("SampleNextStep", on_delete=models.PROTECT, related_name="sample_next_step_by_study",
                                         help_text='Sample next step associated to the study instance.')

    class Meta:
        indexes = [
            models.Index(fields=['sample_next_step', 'step_order', 'study'], name='samplenextstepbystudy_samplenextstep_steporder_study_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=["study_id", "step_order_id", "sample_next_step_id"], name="samplenextstepbystudy_studyid_steporderid_samplenextstepid_key")
        ]

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.sample_next_step is not None and self.step_order is not None and self.step_order.step != self.sample_next_step.step:
            add_error("step", f"Step must match between sample next step and step order.")

        if self.step_order is not None and \
        (self.step_order.order > self.study.end or self.step_order.order < self.study.start):
            add_error("step_order", f"Step order for the sample in the workflow is invalid. The order must be between {self.study.start} and {self.study.end}.")

        if self.sample_next_step is not None and self.sample_next_step.sample is not None and \
        not self.sample_next_step.sample.is_pool and self.study.project != self.sample_next_step.sample.derived_sample_not_pool.project:
            add_error("project", f"Samples and libraries in studies must be associated to the same project unless they are pools.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
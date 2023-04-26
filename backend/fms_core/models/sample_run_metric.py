import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .derived_sample import DerivedSample
from .experiment_run import ExperimentRun
from .readset import Readset
from .tracked_model import TrackedModel

from ._utils import add_error as _add_error

__all__ = ["SampleRunMetric"]


@reversion.register()
class SampleRunMetric(TrackedModel):
    # experiment_run is not set for experiments that were not recorded on Freezeman, dataset run_name may be used
    experiment_run = models.ForeignKey(ExperimentRun, blank=True, null=True, on_delete=models.PROTECT, related_name="sample_run_metrics", help_text="Experiment run for the sample metrics.")
    # derived_sample is not set for experiments that were not recorded on Freezeman, Reaset sample_name may be used    
    derived_sample = models.ForeignKey(DerivedSample, blank=True, null=True, on_delete=models.PROTECT, related_name="sample_run_metrics", help_text="Derived sample matching the metrics.")
    readset = models.OneToOneField(Readset, on_delete=models.PROTECT, related_name="sample_run_metric", help_text="Readset from which were taken the sample metrics.")

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
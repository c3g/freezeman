import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .metric import Metric
from .derived_sample import DerivedSample
from .experiment_run import ExperimentRun
from .dataset_file import DatasetFile
from .tracked_model import TrackedModel

from ._utils import add_error as _add_error

__all__ = ["SampleRunMetric"]


@reversion.register()
class SampleRunMetric(TrackedModel):
    experiment_run = models.ForeignKey(ExperimentRun, on_delete=models.PROTECT, related_name="sample_run_metrics", help_text="Experiment run for the sample metric.")
    derived_sample = models.ForeignKey(DerivedSample, on_delete=models.PROTECT, related_name="sample_run_metrics", help_text="Derived sample matching the metrics.")
    lane = models.IntegerField(help_text="Lane on which the sample was run.")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["experiment_run_id", "dataset_file_id", "metric_id"], name="Samplerunmetric_derivedsampleid_experimentrunid_datasetfileid_metricid_key")
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
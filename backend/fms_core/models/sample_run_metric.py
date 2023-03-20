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
    derived_sample = models.ForeignKey(DerivedSample, on_delete=models.PROTECT, related_name="sample_run_metrics", help_text="Derived sample for the run metric.")
    experiment_run = models.ForeignKey(ExperimentRun, on_delete=models.PROTECT, related_name="sample_run_metrics", help_text="Experiment run for the sample metric.")
    dataset_file = models.ForeignKey(DatasetFile, on_delete=models.PROTECT, related_name="sample_run_metrics", help_text="The dataset for the sample run.")
    metric = models.ForeignKey(Metric, on_delete=models.PROTECT, related_name="sample_run_metrics", help_text="Metric for the sample run.")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["derived_sample_id", "experiment_run_id", "dataset_file_id", "metric_id"], name="Samplerunmetric_derivedsampleid_experimentrunid_datasetfileid_metricid_key")
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
import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .sample_run_metric import SampleRunMetric

from ._constants import STANDARD_NAME_FIELD_LENGTH, STANDARD_STRING_FIELD_LENGTH
from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

__all__ = ["Metric"]


@reversion.register()
class Metric(TrackedModel):
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name for a metric.")
    sample_run_metric = models.ForeignKey(SampleRunMetric, on_delete=models.PROTECT, related_name="metrics", help_text="Readset, Derived sample and experiment run for the metric.")
    metric_group = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Grouping of metrics by categories.")
    value_numeric = models.DecimalField(null=True, blank=True, max_digits=40, decimal_places=20, help_text="Metric numerical value.")
    value_string = models.CharField(null=True, blank=True, max_length=STANDARD_STRING_FIELD_LENGTH, help_text="Metric string value.")

    def __str__(self):
        return self.name

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)
        self.metric_group = str_cast_and_normalize(self.metric_group)
        self.value_string = str_cast_and_normalize(self.value_string)


    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
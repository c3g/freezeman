import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .metric_group import MetricGroup
from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH, STANDARD_STRING_FIELD_LENGTH
from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

__all__ = ["Metric"]


@reversion.register()
class Metric(TrackedModel):
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name for a metric.")
    metric_group = models.ForeignKey(MetricGroup, on_delete=models.PROTECT, related_name="metrics", help_text="The metric group.")
    value_numeric = models.DecimalField(null=True, blank=True, max_digits=40, decimal_places=15, help_text="Metric numerical value.")
    value_string = models.CharField(null=True, blank=True, max_length=STANDARD_STRING_FIELD_LENGTH, help_text="Metric string value.")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["name", "metric_group_id"], name="Metric_name_metricgroupid_key")
        ]

    def __str__(self):
        return self.name

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)

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
from django.db import models
from ._constants import REPORTING_NAME_FIELD_LENGTH, AggregationType, FieldDataType

from .report import Report

__all__ = ["MetricField"]

class MetricField(models.Model):
    name = models.CharField(max_length=REPORTING_NAME_FIELD_LENGTH, help_text="Name of the field containing a report metric.")
    report = models.ForeignKey(Report, on_delete=models.PROTECT, help_text="Report to which the field is related.", related_name="metric_fields")
    is_date = models.BooleanField(default=False, help_text="Flag indicating if the value can be used to filter by date.")
    is_group = models.BooleanField(default=False, help_text="Flag indicating if the value can be a group for aggregation.")
    aggregation = models.CharField(null=True, blank=True, choices=AggregationType.choices, max_length=REPORTING_NAME_FIELD_LENGTH, help_text="Aggregation to use on this field.")
    field_order = models.PositiveIntegerField(help_text="Field order in the report columns.")
    display_name = models.CharField(max_length=REPORTING_NAME_FIELD_LENGTH, help_text="Human readable field name.")
    data_type = models.CharField(choices=FieldDataType.choices, max_length=REPORTING_NAME_FIELD_LENGTH, help_text="Data type contained in the field.")

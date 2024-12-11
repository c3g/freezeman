from django.db import models
from ._constants import REPORTING_NAME_FIELD_LENGTH

__all__ = ["Report"]


class Report(models.Model):
    name = models.CharField(unique=True, max_length=REPORTING_NAME_FIELD_LENGTH, help_text="Internal name by which a report can be identified.")
    display_name = models.CharField(max_length=REPORTING_NAME_FIELD_LENGTH, help_text="Display name of a report.")
    data_model = models.CharField(max_length=REPORTING_NAME_FIELD_LENGTH, help_text="Name of the model from which to get data.")

    class Meta:
        indexes = [
            models.Index(fields=['name'], name='report_name_idx'),
        ]
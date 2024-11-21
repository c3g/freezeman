from django.db import models
from _constants import REPORTING_NAME_FIELD_LENGTH

__all__ = ["Report"]


class Report(models.Model):
    name = models.CharField(unique=True, max_length=REPORTING_NAME_FIELD_LENGTH, help_text="Internal name by which a report can be identified.")

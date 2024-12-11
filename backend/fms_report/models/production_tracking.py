from django.db import models

from fms_core.models.readset import Readset

__all__ = ["ProductionTracking"]


class ProductionTracking(models.Model):
    extracted_readset = models.OneToOneField(Readset, on_delete=models.PROTECT, related_name="production_tracking", help_text="Readset for which the data has been prepared.")
    validation_timestamp = models.DateTimeField(null=True, blank=True, help_text='Timestamp of the validation status when the data was prepared.')

    class Meta:
        indexes = [
            models.Index(fields=['validation_timestamp'], name='prodtracking_timestamp_idx'),
        ]
import reversion

from django.core.exceptions import ValidationError
from django.db import models
from django.apps import apps
from django.utils import timezone
from decimal import Decimal

from .tracked_model import TrackedModel
from .process import Process
from .sample import Sample

from ._utils import add_error as _add_error

__all__ = ["ProcessSample"]

PROTOCOLS_WITH_VOLUME_USED_REQUIRED = ['Extraction', 'Transfer']
PROTOCOLS_WITH_NEGATIVE_VOLUME_USED_ALLOWED = ['Update']

@reversion.register()
class ProcessSample(TrackedModel):
    process = models.ForeignKey(Process, on_delete=models.PROTECT, related_name="process_sample", help_text="Process")
    source_sample = models.ForeignKey(Sample, on_delete=models.PROTECT, related_name="process_sample", help_text="Source Sample")
    execution_date = models.DateField(help_text="Date of execution of the process.")
    volume_used = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True,
                                      help_text="Volume of the source sample used, in µL.")
    comment = models.TextField(blank=True, help_text="Relevant information about the process info.")

    @property
    def protocol_name(self) -> str:
        Protocol = apps.get_model("fms_core", "Protocol")
        process = Process.objects.get(id=self.process_id)
        return Protocol.objects.get(id=process.protocol_id).name


    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.volume_used is None:
            if self.process and self.protocol_name in PROTOCOLS_WITH_VOLUME_USED_REQUIRED:
                add_error("volume_used", f'volume_used by processes for protocol {self.protocol_name} must be specified')

        else:
            if self.protocol_name not in PROTOCOLS_WITH_NEGATIVE_VOLUME_USED_ALLOWED and self.volume_used <= Decimal("0"):
                add_error("volume_used", f'volume_used {self.volume_used} must be positive for protocol {self.protocol_name}')

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
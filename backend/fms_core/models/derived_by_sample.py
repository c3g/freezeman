import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel
from .derived_sample import DerivedSample

from ._utils import add_error as _add_error

__all__ = ["DerivedBySample"]


@reversion.register()
class DerivedBySample(TrackedModel):
    VOLUME_RATIO_DECIMAL_PLACES = 15
    VOLUME_RATIO_MAX_DIGITS = 16

    derived_sample = models.ForeignKey("DerivedSample", on_delete=models.PROTECT, related_name="derived_by_samples")
    sample = models.ForeignKey("Sample", on_delete=models.PROTECT, related_name="derived_by_samples")
    volume_ratio = models.DecimalField(max_digits=VOLUME_RATIO_MAX_DIGITS, decimal_places=VOLUME_RATIO_DECIMAL_PLACES, help_text="Volume ratio in pools.")
    project = models.ForeignKey("Project", null=True, blank=True, on_delete=models.PROTECT, related_name="project_derived_by_samples",
                                help_text="Project linked to the derived sample - sample pair.")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["derived_sample_id", "sample_id"], name="derivedbysample_derivedsampleid_sampleid_key")
        ]

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
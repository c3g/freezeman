import reversion

from django.db import models

from .tracked_model import TrackedModel

__all__ = ["DerivedBySample"]


@reversion.register()
class DerivedBySample(TrackedModel):
    derived_sample = models.ForeignKey("DerivedSample", on_delete=models.PROTECT, related_name="derived_by_samples")
    sample = models.ForeignKey("Sample", on_delete=models.PROTECT, related_name="derived_by_samples")
    volume_ratio = models.DecimalField(max_digits=4, decimal_places=3, help_text="Volume ratio")


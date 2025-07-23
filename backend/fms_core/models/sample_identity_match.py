import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from ._utils import add_error as _add_error

__all__ = ["SampleIdentityMatch"]

@reversion.register()
class SampleIdentityMatch(TrackedModel):
    tested = models.ForeignKey("SampleIdentity", on_delete=models.PROTECT, related_name="tested_identity_match", help_text="Match found while testing this sample identity.")
    matched = models.ForeignKey("SampleIdentity", on_delete=models.PROTECT, related_name="_matched_identity_match", help_text="Match found to be referencing this sample identity.")
    matching_site_ratio = models.DecimalField(max_digits=6, decimal_places=5, help_text="Ratio of the compared sites that are matching.")
    compared_sites = models.PositiveIntegerField(help_text="Number of marker sites that have a value for both samples.")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tested_id", "matched_id"], name="sampleidentitymatch_testedid_matchedid_key")
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
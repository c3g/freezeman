import reversion

from django.db import models

from .tracked_model import TrackedModel

from ._validators import sequence_validator
from ._constants import STANDARD_SEQUENCE_FIELD_LENGTH

__all__ = ["Sequence"]

@reversion.register()
class Sequence(TrackedModel):
    value = models.CharField(max_length=STANDARD_SEQUENCE_FIELD_LENGTH, unique=True, blank=True, validators=[sequence_validator],
                             help_text="The nucleotide string defining the sequence.")

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
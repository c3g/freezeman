import reversion

from django.db import models

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator

__all__ = ["IndexStructure"]

@reversion.register()
class IndexStructure(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the index structure.")

    flanker_3prime_forward = models.ForeignKey("Sequence", related_name="flanker_3prime_forward",
                                               on_delete=models.PROTECT, help_text="Flanker on the 3' forward direction")
    flanker_3prime_reverse = models.ForeignKey("Sequence", related_name="flanker_3prime_reverse",
                                               on_delete=models.PROTECT, help_text="Flanker on the 3' reverse direction")
    flanker_5prime_forward = models.ForeignKey("Sequence", related_name="flanker_5prime_forward",
                                               on_delete=models.PROTECT, help_text="Flanker on the 5' forward direction")
    flanker_5prime_reverse = models.ForeignKey("Sequence", related_name="flanker_5prime_reverse",
                                               on_delete=models.PROTECT, help_text="Flanker on the 5' reverse direction")

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
import reversion

from django.db import models

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator

__all__ = ["Index"]

@reversion.register()
class Index(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the index.")

    index_set = models.ForeignKey("IndexSet", on_delete=models.PROTECT, related_name="indices",
                                  help_text="The set which this index belongs to")

    index_structure = models.ForeignKey("IndexStructure", on_delete=models.PROTECT,
                                        related_name="indices",
                                        help_text="The index structure of the index")

    sequences_3prime = models.ManyToManyField("Sequence", through="SequenceByIndex3Prime",
                                              symmetrical=False, related_name="indices_3prime")
    sequences_5prime = models.ManyToManyField("Sequence", through="SequenceByIndex5Prime",
                                              symmetrical=False, related_name="indices_5prime")

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
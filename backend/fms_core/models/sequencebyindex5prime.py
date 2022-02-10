import reversion

from django.db import models
from .tracked_model import TrackedModel

__all__ = ["SequenceByIndex5Prime"]

@reversion.register()
class SequenceByIndex5Prime(TrackedModel):
    index = models.ForeignKey("Index", help_text="5 primer indices associated",
                              on_delete=models.CASCADE, related_name="sequence_5prime_association")
    sequence = models.ForeignKey("Sequence", help_text="Sequences associated",
                               on_delete=models.CASCADE, related_name="index_5prime_association")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
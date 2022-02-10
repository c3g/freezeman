import reversion

from django.db import models
from .tracked_model import TrackedModel

__all__ = ["SequenceByIndex3Prime"]

@reversion.register()
class SequenceByIndex3Prime(TrackedModel):
    index = models.ForeignKey("Index", help_text="3 primer indices associated",
                              on_delete=models.CASCADE, related_name="sequence_3prime_association")
    sequence = models.ForeignKey("Sequence", help_text="Sequences associated",
                               on_delete=models.CASCADE, related_name="index_3prime_association")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
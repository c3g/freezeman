import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel
from ._utils import add_error as _add_error

__all__ = ["SequenceByIndex3Prime"]

@reversion.register()
class SequenceByIndex3Prime(TrackedModel):
    index = models.ForeignKey("Index", help_text="3 primer indices associated",
                              on_delete=models.PROTECT, related_name="sequence_3prime_association")
    sequence = models.ForeignKey("Sequence", help_text="Sequences associated",
                               on_delete=models.PROTECT, related_name="index_3prime_association")

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.sequence.value == "":
            add_error("sequence", f"Index sequence for ({self.index.name}) need to have at least one character.")

        SameEntry = SequenceByIndex3Prime.objects.filter(index=self.index, sequence=self.sequence).first()
        if SameEntry and SameEntry.id != self.id:
            add_error("sequence", f"Sequence [{self.sequence.value}] is already associated to index {self.index.name}.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
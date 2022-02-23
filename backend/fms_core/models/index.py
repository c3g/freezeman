import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["Index"]

@reversion.register()
class Index(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the index.")

    index_set = models.ForeignKey("IndexSet", blank=True, null=True, on_delete=models.PROTECT, related_name="indices",
                                  help_text="The set which this index belongs to")

    index_structure = models.ForeignKey("IndexStructure", on_delete=models.PROTECT,
                                        related_name="indices",
                                        help_text="The index structure of the index")

    sequences_3prime = models.ManyToManyField("Sequence", through="SequenceByIndex3Prime",
                                              symmetrical=False, related_name="indices_3prime")
    sequences_5prime = models.ManyToManyField("Sequence", through="SequenceByIndex5Prime",
                                              symmetrical=False, related_name="indices_5prime")

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        index_similar_name = Index.objects.filter(name__iexact=self.name).first()
        if index_similar_name and index_similar_name.id != self.id:
            add_error("name", f"Another index with a similar name ({index_similar_name.name}) exists. Two index names cannot be distinguished only by letter case.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
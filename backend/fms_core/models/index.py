import reversion

from django.db import models
from django.core.exceptions import ValidationError
from typing import List

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["Index"]

@reversion.register()
class Index(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the index.")

    external_name = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The fabricator given name of the index. Used internally by the instrument.")
    
    index_structure = models.ForeignKey("IndexStructure", on_delete=models.PROTECT,
                                        related_name="indices",
                                        help_text="The index structure of the index")

    sequences_3prime = models.ManyToManyField("Sequence", through="SequenceByIndex3Prime",
                                              symmetrical=False, related_name="indices_3prime")
    
    sequences_5prime = models.ManyToManyField("Sequence", through="SequenceByIndex5Prime",
                                              symmetrical=False, related_name="indices_5prime")

    index_sets = models.ManyToManyField("IndexSet", through="IndexBySet",
                                        symmetrical=False, related_name="set_indices")

    @property
    def list_3prime_sequences(self) -> List["str"]:
        list_sequences = [sequence.value for sequence in self.sequences_3prime.all()]
        return list_sequences or [""]

    @property
    def list_5prime_sequences(self) -> List["str"]:
        list_sequences = [sequence.value for sequence in self.sequences_5prime.all()]
        return list_sequences or [""]
    
    @property
    def list_index_sets(self) -> List["str"]:
        list_index_sets = [index_set.name for index_set in self.index_sets.all()]
        return list_index_sets

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
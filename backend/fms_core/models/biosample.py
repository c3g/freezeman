import reversion
from django.db import models
from django.core.exceptions import ValidationError
from typing import Optional

from .tracked_model import TrackedModel
from .individual import Individual

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

__all__ = ["Biosample"]


@reversion.register()
class Biosample(TrackedModel):
    alias = models.CharField(max_length=200, blank=True, null=True, help_text="Alternative biosample name given by the collaborator or customer.")
    individual = models.ForeignKey("Individual", blank=True, null=True, on_delete=models.PROTECT,
                                   related_name="biosamples", help_text="Individual associated with the biosample.")
    collection_site = models.CharField(max_length=200, help_text="The facility designated for the collection of samples.")
    comment = models.TextField(blank=True, null=True, help_text="Other relevant information about the biosample.")

    # Computed properties for individuals

    @property
    def individual_name(self) -> str:
        return self.individual.name if self.individual else ""

    @property
    def individual_sex(self) -> str:
        return self.individual.sex if self.individual else ""

    @property
    def individual_taxon(self) -> str:
        return self.individual.taxon if self.individual else ""

    @property
    def individual_cohort(self) -> str:
        return self.individual.cohort if self.individual else ""

    @property
    def individual_pedigree(self) -> str:
        return self.individual.pedigree if self.individual else ""

    @property
    def individual_mother(self) -> Optional["Individual"]:
        return self.individual.mother if self.individual else None

    @property
    def individual_father(self) -> Optional["Individual"]:
        return self.individual.father if self.individual else None

    # ORM Methods

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.alias = str_cast_and_normalize(self.alias)
        self.collection_site = str_cast_and_normalize(self.collection_site)
        self.comment = str_cast_and_normalize(self.comment)

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object


    
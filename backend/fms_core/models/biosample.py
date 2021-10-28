import reversion
from django.db import models
from typing import Optional
from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator

__all__ = ["Biosample"]


@reversion.register()
class Biosample(TrackedModel):
    alias = models.CharField(max_length=200, blank=True, null=True, help_text="Alternative biosample name given by the "
                                                                   "collaborator or customer.")
    individual = models.ForeignKey("Individual", blank=True, null=True, on_delete=models.PROTECT,
                                   related_name="biosamples", help_text="Individual associated with the biosample.")

    collection_site = models.CharField(max_length=200, help_text="The facility designated for the collection "
                                                                 "of samples.")
    comment = models.TextField(blank=True, null=True, help_text="Other relevant information about the biosample.")

    root_sample = models.ForeignKey("Sample", blank=True, null=True, on_delete=models.PROTECT, related_name="biosamples")

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

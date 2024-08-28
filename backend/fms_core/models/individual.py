import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .taxon import Taxon
from .reference_genome import ReferenceGenome

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error


__all__ = ["Individual"]


@reversion.register()
class Individual(TrackedModel):
    """
    Class to store information about an Individual.
    """

    GENERIC_INDIVIDUAL_PREFIX = "GENERIC_"

    SEX_MALE = "M"
    SEX_FEMALE = "F"
    SEX_UNKNOWN = "Unknown"

    SEX_CHOICES = (
        (SEX_MALE, SEX_MALE),
        (SEX_FEMALE, SEX_FEMALE),
        (SEX_UNKNOWN, SEX_UNKNOWN),
    )

    name = models.CharField(max_length=200, unique=True, help_text="Unique identifier for the individual.")
    taxon =  models.ForeignKey(Taxon, on_delete=models.PROTECT,
                               help_text="Taxonomic entry associated to the individual.")
    sex = models.CharField(choices=SEX_CHOICES, max_length=10, help_text="Sex of the individual.")
    pedigree = models.CharField(max_length=200, blank=True, help_text="Common ID to associate children and parents.")
    mother = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name="mother_of",
                               help_text="Mother of the individual.")
    father = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name="father_of",
                               help_text="Father of the individual.")
    cohort = models.CharField(max_length=200, blank=True, help_text="Name to group some individuals in a specific study.")
    alias = models.CharField(blank=True, null=True, max_length=200, help_text="Original individual name used by external client.")
    reference_genome = models.ForeignKey(ReferenceGenome, null=True, blank=True, on_delete=models.PROTECT, related_name="individuals", help_text="Reference genome used to analyze samples.")
    generic = models.BooleanField(default=False, help_text="Generic individual used to replace undefined individuals that share characteristics.")

    class Meta:
        indexes = [
            models.Index(fields=['name'], name='individual_name_idx'),
        ]
    
    @property
    def is_generic(self) -> bool:
        return self.name[:len(self.GENERIC_INDIVIDUAL_PREFIX)] == self.GENERIC_INDIVIDUAL_PREFIX

    def __str__(self):
        return self.name

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)
        self.pedigree = str_cast_and_normalize(self.pedigree)
        self.cohort = str_cast_and_normalize(self.cohort)

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        if self.mother_id is not None and self.father_id is not None and self.mother_id == self.father_id:
            e = "Mother and father IDs can't be the same."
            add_error("mother", e)
            add_error("father", e)

        if self.mother_id is not None and self.mother_id == self.id:
            add_error("mother", "Mother cannot be same as self.")

        if self.father_id is not None and self.father_id == self.id:
            add_error("father", "Father cannot be same as self.")

        if self.mother_id is not None and self.pedigree != self.mother.pedigree:
            add_error("pedigree", "Pedigree between individual and mother must match")

        if self.father_id is not None and self.pedigree != self.father.pedigree:
            add_error("pedigree", "Pedigree between individual and father must match")

        if self.reference_genome is not None and self.taxon_id != self.reference_genome.taxon_id:
            add_error("reference_genome", "Reference genome must match the individual taxon.")

        if self.father_id is not None and self.father.sex == self.SEX_FEMALE:
            add_error("father", "Father cannot be of female sex.")

        if self.mother_id is not None and self.mother.sex == self.SEX_MALE:
            add_error("mother", "Mother cannot be of male sex.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object

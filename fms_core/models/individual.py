import reversion

from django.core.exceptions import ValidationError
from django.db import models

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error


__all__ = ["Individual"]


@reversion.register()
class Individual(models.Model):
    """
    Class to store information about an Individual.
    """

    TAXON_HOMO_SAPIENS = "Homo sapiens"
    TAXON_MUS_MUSCULUS = "Mus musculus"
    TAXON_SARS_COV_2 = "Sars-Cov-2"

    TAXON_CHOICES = (
        (TAXON_HOMO_SAPIENS, TAXON_HOMO_SAPIENS),
        (TAXON_MUS_MUSCULUS, TAXON_MUS_MUSCULUS),
        (TAXON_SARS_COV_2, TAXON_SARS_COV_2),
    )

    SEX_MALE = "M"
    SEX_FEMALE = "F"
    SEX_UNKNOWN = "Unknown"

    SEX_CHOICES = (
        (SEX_MALE, SEX_MALE),
        (SEX_FEMALE, SEX_FEMALE),
        (SEX_UNKNOWN, SEX_UNKNOWN),
    )

    name = models.CharField(max_length=200, unique=True, help_text="Unique identifier for the individual.")
    taxon = models.CharField(choices=TAXON_CHOICES, max_length=20, help_text="Taxonomic group of a species.")
    sex = models.CharField(choices=SEX_CHOICES, max_length=10, help_text="Sex of the individual.")
    pedigree = models.CharField(max_length=200, blank=True, help_text="Common ID to associate children and parents.")
    mother = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name="mother_of",
                               help_text="Mother of the individual.")
    father = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name="father_of",
                               help_text="Father of the individual.")
    # required ?
    cohort = models.CharField(max_length=200, blank=True, help_text="Name to group some individuals in "
                                                                    "a specific study.")

    def __str__(self):
        return self.name

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)
        self.pedigree = str_cast_and_normalize(self.pedigree)
        self.cohort = str_cast_and_normalize(self.cohort)

    def clean(self):
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        if self.mother_id is not None and self.father_id is not None and self.mother_id == self.father_id:
            e = "Mother and father IDs can't be the same."
            add_error("mother", e)
            add_error("father", e)

        if self.mother_id is not None and self.mother_id == self.id:
            add_error("mother", "Mother can't be same as self.")

        if self.father_id is not None and self.father_id == self.id:
            add_error("father", "Father can't be same as self.")

        if self.mother_id is not None and self.pedigree != self.mother.pedigree:
            add_error("pedigree", "Pedigree between individual and mother must match")

        if self.father_id is not None and self.pedigree != self.father.pedigree:
            add_error("pedigree", "Pedigree between individual and father must match")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object

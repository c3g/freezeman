import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .taxon import Taxon

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["ReferenceGenome"]


@reversion.register()
class ReferenceGenome(TrackedModel):
    assembly_name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Assembly name of the reference genome.", validators=[name_validator])
    synonym = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Other name of the reference genome.", validators=[name_validator])
    genbank_id = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="GenBank accession number of the reference genome.", validators=[name_validator])
    refseq_id = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="RefSeq identifier of the reference genome.", validators=[name_validator])
    taxon = models.ForeignKey(Taxon, on_delete=models.PROTECT, related_name="ReferenceGenomes", help_text="Reference genome used to analyze samples in the study.")
    size = models.DecimalField(max_digits=20, decimal_places=0, help_text="Number of base pairs of the reference genome.")

    def __str__(self):
        return self.assembly_name

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
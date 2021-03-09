import reversion

from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models

from ._utils import add_error as _add_error


class SampleLineage(models.Model):
    child = models.ForeignKey("Sample", help_text="Child sample",
                              on_delete=models.CASCADE, related_name="child_sample")
    parent = models.ForeignKey("Sample", help_text="Parent sample",
                               on_delete=models.CASCADE, related_name="parent_sample")
    process_sample = models.ForeignKey("ProcessSample", help_text="process used for sample creation",
                                       on_delete=models.PROTECT, related_name="lineage")

    def clean(self):
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        from .sample import Sample
        if self.child.sample_kind.name not in Sample.BIOSPECIMEN_TYPES_NA:
            add_error("sample_kind", "Extracted sample need to be a type of Nucleic Acid.")

        if self.parent.sample_kind.name in Sample.BIOSPECIMEN_TYPES_NA:
            add_error("extracted_from",
                      f"Extraction process cannot be run on sample of type {', '.join(Sample.BIOSPECIMEN_TYPES_NA)}")

        if not self.child.tissue_source:
            add_error("tissue_source", "Extracted sample need to have a tissue source.")
        elif self.child.tissue_source != Sample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE[self.parent.sample_kind.name]:
            add_error("tissue_source", "Extracted sample tissue_source must match parent sample_kind.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object


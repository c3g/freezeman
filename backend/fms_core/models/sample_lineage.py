import reversion

from decimal import Decimal
from django.core.exceptions import MultipleObjectsReturned, ValidationError
from django.db import models
from django.apps import apps

from .tracked_model import TrackedModel

from ._utils import add_error as _add_error

@reversion.register()
class SampleLineage(TrackedModel):
    child = models.ForeignKey("Sample", on_delete=models.CASCADE, related_name="child_sample", help_text="Child sample.")
    parent = models.ForeignKey("Sample", on_delete=models.CASCADE, related_name="parent_sample", help_text="Parent sample.")
    process_measurement = models.ForeignKey("ProcessMeasurement", on_delete=models.PROTECT, related_name="lineage",
                                            help_text="process used for sample creation.")

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        protocol_name = self.process_measurement.process.protocol.name
        if protocol_name == 'Extraction':
            DerivedSample = apps.get_model("fms_core", "DerivedSample")
            # There is only a single expected derived sample for the child and parent of an extraction
            try:
                child_derived = self.child.derived_samples.objects.get()
                parent_derived = self.parent.derived_samples.objects.get()
            except MultipleObjectsReturned:
                add_error("derived_sample", "Extraction child and/or parent has more than one derived sample.")
                
            if child_derived.sample_kind.name not in DerivedSample.BIOSPECIMEN_TYPES_NA:
                add_error("sample_kind", "Extracted sample need to be a type of Nucleic Acid.")
            if parent_derived.sample_kind.name in DerivedSample.BIOSPECIMEN_TYPES_NA:
                add_error("extracted_from",
                          f"Extraction process cannot be run on sample of type {', '.join(DerivedSample.BIOSPECIMEN_TYPES_NA)}.")
            if not child_derived.tissue_source:
                add_error("tissue_source", "Extracted sample need to have a tissue source.")
            elif parent_derived.tissue_source != DerivedSample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE[parent_derived.sample_kind.name]:
                add_error("tissue_source", "Extracted sample tissue_source must match parent sample_kind.")
        
        if self.child == self.parent:
            add_error("child", "A sample cannot have itself as child.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
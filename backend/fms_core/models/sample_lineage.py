import reversion

from django.core.exceptions import MultipleObjectsReturned, ValidationError
from django.db import models
from django.apps import apps

from .tracked_model import TrackedModel
from .derived_sample import DerivedSample

from ._utils import add_error as _add_error

@reversion.register()
class SampleLineage(TrackedModel):
    child = models.ForeignKey("Sample", on_delete=models.PROTECT, related_name="child_sample", help_text="Child sample.")
    parent = models.ForeignKey("Sample", on_delete=models.PROTECT, related_name="parent_sample", help_text="Parent sample.")
    process_measurement = models.ForeignKey("ProcessMeasurement", on_delete=models.PROTECT, related_name="lineage",
                                            help_text="process used for sample creation.")

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        protocol_name = self.process_measurement.process.protocol.name
        if protocol_name == "Extraction":
            # There is only a single expected derived sample for the child and parent of an extraction
            try:
                child_derived = self.child.derived_samples.get()
                parent_derived = self.parent.derived_samples.get()
            except MultipleObjectsReturned:
                add_error("derived_sample", "Extraction child and/or parent has more than one derived sample.")

            if not errors:
                if not child_derived.sample_kind.is_extracted:
                    add_error("sample_kind", "Extracted sample need to be a type of Nucleic Acid.")
                if parent_derived.sample_kind.is_extracted:
                    add_error("extracted_from",
                              "Extraction process cannot be run on samples of extracted kinds like DNA and RNA.")
                if not child_derived.tissue_source:
                    add_error("tissue_source", "Extracted sample need to have a tissue source.")
                elif child_derived.tissue_source != parent_derived.sample_kind:
                    add_error("tissue_source", "Extracted sample tissue_source must match parent sample_kind.")
        elif any([protocol_name == "Transfer", protocol_name == "Illumina Infinium Preparation", protocol_name == "DNBSEQ Preparation"]):
            if list(self.child.derived_samples.values_list("id", flat=True).order_by("id")) != list(self.parent.derived_samples.values_list("id", flat=True).order_by("id")):
                add_error("derived_sample", f"Transferred sample {self.child.name} need to have the same derived samples as its parent.")
        elif protocol_name == "Sample Pooling":
            # Check that parent.derived_samples are a subset of the child.derived_samples.
            if not set(self.parent.derived_samples.values_list("id", flat=True)).issubset(set(self.child.derived_samples.values_list("id", flat=True))):
                add_error("derived_sample", f"Pooled sample {self.child.name} does not include all the derived samples of the parent.")

        if self.child == self.parent:
            add_error("child", "A sample cannot have itself as child.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
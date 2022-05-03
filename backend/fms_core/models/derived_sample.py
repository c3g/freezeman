import reversion

from django.db import models
from django.core.exceptions import ValidationError
from ..schema_validators import JsonSchemaValidator, EXPERIMENTAL_GROUP_SCHEMA

from .tracked_model import TrackedModel
from .sample_kind import SampleKind
from .library import Library

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

__all__ = ["DerivedSample"]


@reversion.register()
class DerivedSample(TrackedModel):
    biosample = models.ForeignKey("Biosample", on_delete=models.PROTECT, related_name="derived_samples",
                                  help_text="Biosample associated to this DerivedSample")
    sample_kind = models.ForeignKey(SampleKind, on_delete=models.PROTECT,
                                    help_text="Biological material collected from study subject during the conduct of a genomic study project.")
    experimental_group = models.JSONField(blank=True, default=list, validators=[JsonSchemaValidator(EXPERIMENTAL_GROUP_SCHEMA)],
                                          help_text="Sample group having some common characteristics. "
                                                    "It is the way to designate a subgroup within a study.")
    tissue_source = models.ForeignKey(SampleKind, null=True, blank=True, on_delete=models.PROTECT,
                                      help_text="Can only be specified if the sample kind is DNA or RNA (i.e. is an extracted sample kind).")
    library = models.OneToOneField(Library, null=True, blank=True, on_delete=models.PROTECT, related_name="derived_sample",
                                   help_text="Library associated to this Derived Sample.")

    @property
    def extracted_from(self): # returns a tuple of samples (extracted, extracted_from)
        return next(iter([(sample, sample.extracted_from) for sample in self.samples.all() if sample.extracted_from]), (None, None))

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))
            
        if self.id:
            extracted, extracted_from = self.extracted_from
            if extracted and extracted_from:
                if not self.sample_kind.is_extracted:
                    add_error("sample_kind", f"Extracted sample {extracted.name} need to be a type of Nucleic Acid.")

                if extracted_from.derived_sample_not_pool.sample_kind.is_extracted:
                    add_error("extracted_from", f"Extraction process cannot be run on samples of extracted kinds like DNA and RNA.")

                original_sample_kind = extracted_from.derived_sample_not_pool.sample_kind # extracted_from samples are not pools
                if self.tissue_source != original_sample_kind:
                    add_error("tissue_source",
                              f"Mismatch between sample tissue source {self.tissue_source.name} and original sample kind {original_sample_kind.name}.")
        
        if self.tissue_source is not None and not self.sample_kind.is_extracted:
            add_error("tissue_source", "Tissue source can only be specified for extracted samples.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
import reversion

from django.db import models

from ..schema_validators import JsonSchemaValidator, EXPERIMENTAL_GROUP_SCHEMA

from .tracked_model import TrackedModel
from .sample_kind import SampleKind


__all__ = ["DerivedSample"]


@reversion.register()
class DerivedSample(TrackedModel):

    BIOSPECIMEN_TYPE_DNA = "DNA"
    BIOSPECIMEN_TYPE_RNA = "RNA"
    BIOSPECIMEN_TYPE_BAL = "BAL"
    BIOSPECIMEN_TYPE_BIOPSY = "BIOPSY"
    BIOSPECIMEN_TYPE_BLOOD = "BLOOD"
    BIOSPECIMEN_TYPE_CELLS = "CELLS"
    BIOSPECIMEN_TYPE_EXPECTORATION = "EXPECTORATION"
    BIOSPECIMEN_TYPE_GARGLE = "GARGLE"
    BIOSPECIMEN_TYPE_PLASMA = "PLASMA"
    BIOSPECIMEN_TYPE_SALIVA = "SALIVA"
    BIOSPECIMEN_TYPE_SWAB = "SWAB"

    # Nucleic acid biospecimen types and choices
    BIOSPECIMEN_TYPES_NA = (BIOSPECIMEN_TYPE_DNA, BIOSPECIMEN_TYPE_RNA)
    BIOSPECIMEN_TYPE_NA_CHOICES = (
        (BIOSPECIMEN_TYPE_DNA, BIOSPECIMEN_TYPE_DNA),
        (BIOSPECIMEN_TYPE_RNA, BIOSPECIMEN_TYPE_RNA),
    )

    # All biospecimen types for which the concentration field is required for
    # a sample object to validate successfully.
    BIOSPECIMEN_TYPES_CONC_REQUIRED = (BIOSPECIMEN_TYPE_DNA,)

    # All choices for biospecimen_type
    BIOSPECIMEN_TYPE_CHOICES = (
        *BIOSPECIMEN_TYPE_NA_CHOICES,
        (BIOSPECIMEN_TYPE_BAL, BIOSPECIMEN_TYPE_BAL),
        (BIOSPECIMEN_TYPE_BIOPSY, BIOSPECIMEN_TYPE_BIOPSY),
        (BIOSPECIMEN_TYPE_BLOOD, BIOSPECIMEN_TYPE_BLOOD),
        (BIOSPECIMEN_TYPE_CELLS, BIOSPECIMEN_TYPE_CELLS),
        (BIOSPECIMEN_TYPE_EXPECTORATION, BIOSPECIMEN_TYPE_EXPECTORATION),
        (BIOSPECIMEN_TYPE_GARGLE, BIOSPECIMEN_TYPE_GARGLE),
        (BIOSPECIMEN_TYPE_PLASMA, BIOSPECIMEN_TYPE_PLASMA),
        (BIOSPECIMEN_TYPE_SALIVA, BIOSPECIMEN_TYPE_SALIVA),
        (BIOSPECIMEN_TYPE_SWAB, BIOSPECIMEN_TYPE_SWAB),
    )

    TISSUE_SOURCE_BAL = "BAL"
    TISSUE_SOURCE_BIOPSY = "Biopsy"
    TISSUE_SOURCE_BLOOD = "Blood"
    TISSUE_SOURCE_CELLS = "Cells"
    TISSUE_SOURCE_EXPECTORATION = "Expectoration"
    TISSUE_SOURCE_GARGLE = "Gargle"
    TISSUE_SOURCE_PLASMA = "Plasma"
    TISSUE_SOURCE_SALIVA = "Saliva"
    TISSUE_SOURCE_SWAB = "Swab"
    TISSUE_SOURCE_TUMOR = "Tumor"
    TISSUE_SOURCE_BUFFY_COAT = "Buffy coat"
    TISSUE_SOURCE_TAIL = "Tail"

    TISSUE_SOURCE_CHOICES = (
        (TISSUE_SOURCE_BAL, TISSUE_SOURCE_BAL),
        (TISSUE_SOURCE_BIOPSY, TISSUE_SOURCE_BIOPSY),
        (TISSUE_SOURCE_BLOOD, TISSUE_SOURCE_BLOOD),
        (TISSUE_SOURCE_CELLS, TISSUE_SOURCE_CELLS),
        (TISSUE_SOURCE_EXPECTORATION, TISSUE_SOURCE_EXPECTORATION),
        (TISSUE_SOURCE_GARGLE, TISSUE_SOURCE_GARGLE),
        (TISSUE_SOURCE_PLASMA, TISSUE_SOURCE_PLASMA),
        (TISSUE_SOURCE_SALIVA, TISSUE_SOURCE_SALIVA),
        (TISSUE_SOURCE_SWAB, TISSUE_SOURCE_SWAB),
        (TISSUE_SOURCE_TUMOR, TISSUE_SOURCE_TUMOR),
        (TISSUE_SOURCE_BUFFY_COAT, TISSUE_SOURCE_BUFFY_COAT),
        (TISSUE_SOURCE_TAIL, TISSUE_SOURCE_TAIL),
    )

    # Map between biospecimen type and tissue source; used when processing
    # extractions in order to infer the tissue source based on the original
    # sample's biospecimen type.
    BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE = {
        BIOSPECIMEN_TYPE_BAL: TISSUE_SOURCE_BAL,
        BIOSPECIMEN_TYPE_BIOPSY: TISSUE_SOURCE_BIOPSY,
        BIOSPECIMEN_TYPE_BLOOD: TISSUE_SOURCE_BLOOD,
        BIOSPECIMEN_TYPE_CELLS: TISSUE_SOURCE_CELLS,
        BIOSPECIMEN_TYPE_EXPECTORATION: TISSUE_SOURCE_EXPECTORATION,
        BIOSPECIMEN_TYPE_GARGLE: TISSUE_SOURCE_GARGLE,
        BIOSPECIMEN_TYPE_PLASMA: TISSUE_SOURCE_PLASMA,
        BIOSPECIMEN_TYPE_SALIVA: TISSUE_SOURCE_SALIVA,
        BIOSPECIMEN_TYPE_SWAB: TISSUE_SOURCE_SWAB,
    }

    biosample = models.ForeignKey("Biosample", on_delete=models.PROTECT, related_name="derived_samples",
                                  help_text="Biosample associated to this DerivedSample")

    sample_kind = models.ForeignKey(SampleKind, on_delete=models.PROTECT,
                                    help_text="Biological material collected from study subject "
                                              "during the conduct of a genomic study project.")


    experimental_group = models.JSONField(blank=True, default=list,
                                          validators=[JsonSchemaValidator(EXPERIMENTAL_GROUP_SCHEMA)],
                                          help_text="Sample group having some common characteristics. "
                                                    "It is the way to designate a subgroup within a study.")

    tissue_source = models.CharField(max_length=200, blank=True, choices=TISSUE_SOURCE_CHOICES,
                                     help_text="Can only be specified if the biospecimen type is DNA or RNA.")

    library = models.CharField(max_length=200, blank=True)

    index = models.CharField(max_length=200, blank=True)


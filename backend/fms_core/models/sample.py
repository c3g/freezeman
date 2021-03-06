import reversion

from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from django.apps import apps
from django.utils import timezone
from typing import Optional, List

from ..containers import (
    CONTAINER_SPEC_TUBE,
    CONTAINER_SPEC_TUBE_RACK_8X12,
    CONTAINER_KIND_SPECS,
    SAMPLE_CONTAINER_KINDS,
)
from ..coordinates import CoordinateError, check_coordinate_overlap
from ..schema_validators import JsonSchemaValidator, VOLUME_VALIDATOR, EXPERIMENTAL_GROUP_SCHEMA
from ..utils import float_to_decimal, str_cast_and_normalize

from .tracked_model import TrackedModel
from .sample_lineage import SampleLineage
from .container import Container
from .individual import Individual
from .sample_kind import SampleKind

from ._constants import BARCODE_NAME_FIELD_LENGTH
from ._utils import add_error as _add_error
from ._validators import name_validator

__all__ = ["Sample"]


@reversion.register()
class Sample(TrackedModel):
    """ Class to store information about a sample. """

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

    sample_kind = models.ForeignKey(SampleKind, on_delete=models.PROTECT,
                                    help_text="Biological material collected from study subject "
                                              "during the conduct of a genomic study project.")
    name = models.CharField(max_length=BARCODE_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="Sample name.")
    alias = models.CharField(max_length=200, blank=True, help_text="Alternative sample name given by the "
                                                                   "collaborator or customer.")
    individual = models.ForeignKey("Individual", on_delete=models.PROTECT, help_text="Individual associated "
                                                                                     "with the sample.")

    volume = models.DecimalField(max_digits=20, decimal_places=3, help_text="Current volume of the sample, in µL. ")

    # Concentration is REQUIRED if sample kind name in {DNA, RNA}.
    concentration = models.DecimalField(
        "concentration in ng/µL",
        max_digits=20,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Concentration in ng/µL. Required for nucleic acid samples."
    )

    depleted = models.BooleanField(default=False, help_text="Whether this sample has been depleted.")

    experimental_group = models.JSONField(blank=True, default=list,
                                          validators=[JsonSchemaValidator(EXPERIMENTAL_GROUP_SCHEMA)],
                                          help_text="Sample group having some common characteristics. "
                                                    "It is the way to designate a subgroup within a study.")
    collection_site = models.CharField(max_length=200, help_text="The facility designated for the collection "
                                                                 "of samples.")
    tissue_source = models.CharField(max_length=200, blank=True, choices=TISSUE_SOURCE_CHOICES,
                                     help_text="Can only be specified if the biospecimen type is DNA or RNA.")
    creation_date = models.DateField(help_text="Date of the sample reception or extraction.")
    phenotype = models.CharField(max_length=200, blank=True, help_text="Sample phenotype.")

    comment = models.TextField(blank=True, help_text="Other relevant information about the sample.")
    update_comment = models.TextField(blank=True, help_text="Comment describing the latest updates made to the sample. "
                                                            "Change this whenever updates are made.")

    # In what container is this sample located?
    # TODO: I would prefer consistent terminology with Container if possible for this heirarchy
    container = models.ForeignKey(Container, on_delete=models.PROTECT, related_name="samples",
                                  limit_choices_to={"kind__in": SAMPLE_CONTAINER_KINDS},
                                  help_text="Designated location of the sample.")
    # Location within the container, specified by coordinates
    # TODO list of choices ?
    coordinates = models.CharField(max_length=10, blank=True,
                                   help_text="Coordinates of the sample in a parent container. Only applicable for "
                                             "containers that directly store samples with coordinates, e.g. plates.")

    child_of = models.ManyToManyField("self", blank=True, through="SampleLineage",
                                      symmetrical=False, related_name="parent_of")

    class Meta:
        unique_together = ("container", "coordinates")

    @property
    def is_depleted(self) -> str:
        return "yes" if self.depleted else "no"

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

    # Computed properties for containers

    @property
    def container_barcode(self) -> Optional[str]:
        return self.container.barcode if self.container else None

    @property
    def container_kind(self) -> Optional[str]:
        return self.container.kind if self.container else None

    @property
    def container_name(self) -> Optional[str]:
        return self.container.name if self.container else None

    @property
    def container_location(self) -> Optional[Container]:
        return self.container.location if self.container else None

    @property
    def context_sensitive_coordinates(self) -> str:
        return self.coordinates if self.coordinates else (self.container.coordinates if self.container else "")

    # Computed properties for lineage
    @property
    def parents(self) -> List["Sample"]:
        return self.child_of.filter(parent_sample__child=self).all() if self.id else None

    @property
    def children(self) -> List["Sample"]:
        return self.parent_of.filter(child_sample__parent=self).all() if self.id else None

    @property
    def source_depleted(self) -> bool:
        return self.extracted_from.depleted if self.extracted_from else None

    @property
    def extracted_from(self) -> ["Sample"]:
        return self.child_of.filter(parent_sample__child=self, parent_sample__process_sample__process__protocol__name="Extraction").first() if self.id else None

    @property
    def transferred_from(self) -> ["Sample"]:
        return self.child_of.filter(parent_sample__child=self, parent_sample__process_sample__process__protocol__name="Transfer").first() if self.id else None

    # Representations

    def __str__(self):
        return f"{self.name} {'extracted, ' if self.extracted_from else ''}" \
               f"({self.container}{f' at {self.coordinates }' if self.coordinates else ''})"

    # ORM Methods

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)
        self.alias = str_cast_and_normalize(self.alias)
        self.collection_site = str_cast_and_normalize(self.collection_site)
        self.tissue_source = str_cast_and_normalize(self.tissue_source)
        self.phenotype = str_cast_and_normalize(self.phenotype)
        self.comment = str_cast_and_normalize(self.comment)
        self.update_comment = str_cast_and_normalize(self.update_comment)

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        # Sample Kind
        sample_kind_choices = (Sample.BIOSPECIMEN_TYPE_NA_CHOICES if self.extracted_from
                               else Sample.BIOSPECIMEN_TYPE_CHOICES)

        if self.sample_kind_id is not None:
            if self.sample_kind.name not in frozenset(c[0] for c in sample_kind_choices):
                add_error(
                    "sample_kind",
                    (f"Sample Kind name {self.sample_kind.name} not valid for "
                     f"{' extracted' if self.extracted_from else ''} sample {self.name}"),
                )
            # Check concentration fields given sample_kind
            if self.sample_kind.name in Sample.BIOSPECIMEN_TYPES_CONC_REQUIRED and self.concentration is None:
                add_error("concentration", "Concentration must be specified if the sample_kind is DNA")

            # Check tissue source given extracted_from

            if self.tissue_source and self.sample_kind.name not in Sample.BIOSPECIMEN_TYPES_NA:
                add_error("tissue_source", "Tissue source can only be specified for a nucleic acid sample.")

            if self.transferred_from and self.sample_kind != self.transferred_from.sample_kind:
                    add_error("sample_kind", "Sample kind need to remain the same during transfer")

            if self.extracted_from and self.sample_kind.name not in Sample.BIOSPECIMEN_TYPES_NA:
                add_error("sample_kind", "Extracted sample need to be a type of Nucleic Acid.")


        if self.extracted_from:
            if self.extracted_from.sample_kind.name in Sample.BIOSPECIMEN_TYPES_NA:
                add_error(
                    "extracted_from",
                    f"Extraction process cannot be run on sample of type {', '.join(Sample.BIOSPECIMEN_TYPES_NA)}"
                )

            original_sample_kind = self.extracted_from.sample_kind.name
            if self.tissue_source != Sample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE[original_sample_kind]:
                add_error(
                    "tissue_source",
                    (f"Mismatch between sample tissue source {self.tissue_source} and original sample kind "
                     f"{original_sample_kind}")
                )

        # Check volume value
        if self.volume is not None and self.volume < Decimal("0"):
            add_error("volume", "Current volume must be positive.")


        # Validate container consistency

        if self.container_id is not None:
            parent_spec = CONTAINER_KIND_SPECS[self.container.kind]

            #  - Validate that parent can hold samples
            if not parent_spec.sample_holding:
                add_error("container", f"Parent container kind {parent_spec.container_kind_id} cannot hold samples")

            #  - Currently, extractions can only output tubes in a TUBE_RACK_8X12
            # WARNING !!! Removed this validation. Untestable with current structure. Also extraction create 8x12.

            #  - Validate coordinates against parent container spec
            if not errors.get("container"):
                try:
                    self.coordinates = parent_spec.validate_and_normalize_coordinates(self.coordinates)
                except CoordinateError as e:
                    add_error("container", str(e))

            # TODO: This isn't performant for bulk ingestion
            # - Check for coordinate overlap with existing child containers of the parent
            if not errors.get("container") and not parent_spec.coordinate_overlap_allowed:
                try:
                    check_coordinate_overlap(self.container.samples, self, self.container, obj_type="sample")
                except CoordinateError as e:
                    add_error("container", str(e))
                except Sample.DoesNotExist:
                    # Fine, the coordinates are free to use.
                    pass

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
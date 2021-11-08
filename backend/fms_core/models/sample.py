import reversion

from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from django.apps import apps
from django.utils import timezone
from typing import Optional, List

from ..containers import (
    CONTAINER_KIND_SPECS,
    SAMPLE_CONTAINER_KINDS,
)
from ..coordinates import CoordinateError, check_coordinate_overlap
from ..schema_validators import JsonSchemaValidator, EXPERIMENTAL_GROUP_SCHEMA
from ..utils import float_to_decimal, str_cast_and_normalize

from .tracked_model import TrackedModel
from .sample_lineage import SampleLineage
from .container import Container
from .sample_kind import SampleKind
from .project import Project

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._utils import add_error as _add_error
from ._validators import name_validator

__all__ = ["Sample"]


@reversion.register()
class Sample(TrackedModel):
    """ Class to store information about the physical properties of a sample. """

    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator], help_text="Sample name.")
    volume = models.DecimalField(max_digits=20, decimal_places=3, help_text="Current volume of the sample, in µL.")
    concentration = models.DecimalField("concentration in ng/µL", max_digits=20, decimal_places=3, null=True, blank=True,
                                        help_text="Concentration in ng/µL. Required for DNA).")
    depleted = models.BooleanField(default=False, help_text="Whether this sample has been depleted.")
    creation_date = models.DateField(help_text="Date of the sample reception or extraction.")
    container = models.ForeignKey(Container, on_delete=models.PROTECT, related_name="samples", limit_choices_to={"kind__in": SAMPLE_CONTAINER_KINDS},
                                  help_text="Container in which the sample is placed.")
    coordinates = models.CharField(max_length=10, blank=True,
                                   help_text="Coordinates of the sample in a sample holding container. Only applicable for "
                                             "containers that directly store samples with coordinates, e.g. plates.")

    child_of = models.ManyToManyField("self", blank=True, through="SampleLineage", symmetrical=False, related_name="parent_of")
    derived_samples = models.ManyToManyField("DerivedSample", blank=True, through="DerivedBySample", symmetrical=False, related_name="samples")

    class Meta:
        unique_together = ("container", "coordinates")

    @property
    def is_depleted(self) -> str:
        return "yes" if self.depleted else "no"

    @property
    def is_pool(self) -> bool:
        return self.derived_samples.objects.count() > 1

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

    # Computed property for project relation
    @property
    def projects(self) -> List["Project"]:
        return self.projects.all() if self.id else None

    @property
    def source_depleted(self) -> bool:
        return self.extracted_from.depleted if self.extracted_from else None

    @property
    def extracted_from(self) -> "Sample":
        return self.child_of.filter(parent_sample__child=self, parent_sample__process_measurement__process__protocol__name="Extraction").first() if self.id else None

    @property
    def transferred_from(self) -> "Sample":
        return self.child_of.filter(parent_sample__child=self, parent_sample__process_measurement__process__protocol__name="Transfer").first() if self.id else None

    # Representations

    def __str__(self):
        return f"{self.name} {'extracted, ' if self.extracted_from else ''}" \
               f"({self.container}{f' at {self.coordinates }' if self.coordinates else ''})"

    # ORM Methods

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        DerivedSample = apps.get_model("fms_core", "DerivedSample")
        # Check concentration fields given sample_kind
        if self.concentration is None and (self.is_pool or self.derived_samples.objects.first().sample_kind.name in DerivedSample.BIOSPECIMEN_TYPES_CONC_REQUIRED):
            add_error("concentration", "Concentration must be specified for a pool or if the sample_kind is DNA")

        if self.transferred_from:
            if list(self.derived_samples.objects.all()) != list(self.transferred_from.derived_samples.objects.all()):
                    add_error("derived_sample", f"Transferred sample {self.name} need to have the same derived samples as its parent.")           

        # Check volume value
        if self.volume is not None and self.volume < Decimal("0"):
            add_error("volume", "Current volume must be positive.")

        # Validate container consistency
        if self.container_id is not None:
            parent_spec = CONTAINER_KIND_SPECS[self.container.kind]

            #  - Validate that parent can hold samples
            if not parent_spec.sample_holding:
                add_error("container", f"Parent container kind {parent_spec.container_kind_id} cannot hold samples")

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
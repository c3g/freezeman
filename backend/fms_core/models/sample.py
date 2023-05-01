from calendar import c
import reversion

from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import OuterRef, F
from django.apps import apps
from typing import Optional, List, Union

from ..containers import (
    CONTAINER_KIND_SPECS,
    SAMPLE_CONTAINER_KINDS,
)
from ..coordinates import CoordinateError, check_coordinate_overlap
from ..utils import str_cast_and_normalize, float_to_decimal, is_date_or_time_after_today, decimal_rounded_to_precision

from .tracked_model import TrackedModel
from .container import Container
from .coordinate import Coordinate
from .project import Project
from .derived_sample import DerivedSample
from .derived_by_sample import DerivedBySample
from .biosample import Biosample

from ._constants import STANDARD_NAME_FIELD_LENGTH, SINGLE_STRANDED, DOUBLE_STRANDED, SampleType
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
    fragment_size = models.DecimalField(max_digits=20, decimal_places=0, null=True, blank=True,
                                        help_text="Average size of the nucleic acid strands in base pairs.")
    depleted = models.BooleanField(default=False, help_text="Whether this sample has been depleted.")
    creation_date = models.DateField(help_text="Date of the sample reception or extraction.")
    container = models.ForeignKey(Container, on_delete=models.PROTECT, related_name="samples", limit_choices_to={"kind__in": SAMPLE_CONTAINER_KINDS},
                                  help_text="Container in which the sample is placed.")
    coordinate = models.ForeignKey(Coordinate, null=True, blank=True, on_delete=models.PROTECT, related_name="samples", 
                                   help_text="Coordinates of the sample in a sample holding container. Only applicable for "
                                             "containers that directly store samples with coordinates, e.g. plates.")
    comment = models.TextField(blank=True, help_text="Other relevant information about the biosample.")

    child_of = models.ManyToManyField("self", blank=True, through="SampleLineage", symmetrical=False, related_name="parent_of")

    quality_flag = models.BooleanField(choices=[(True, 'Passed'), (False, 'Failed')], null=True, blank=True,
                                       help_text='Quality flag of the sample.', max_length=20)
    quantity_flag = models.BooleanField(choices=[(True, 'Passed'), (False, 'Failed')], null=True, blank=True,
                                        help_text='Quantity flag of the sample.', max_length=20)

    derived_samples = models.ManyToManyField("DerivedSample", blank=True, through="DerivedBySample", symmetrical=False, related_name="samples")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["container", "coordinate"], name="sample_container_coordinate_key")
        ]

    @property
    def coordinates(self) -> str:
        return self.coordinate.name if self.coordinate is not None else None

    @property
    def is_depleted(self) -> str:
        return "yes" if self.depleted else "no"

    @property
    def is_kind_extracted(self) -> bool:
        return self.derived_samples.first().sample_kind.is_extracted

    @property
    def is_pool(self) -> bool:
        return DerivedBySample.objects.filter(sample=self).count() > 1 # More than 1 DerivedBySample implies more than 1 DerivedSample

    @property
    def is_library(self) -> bool:
        return True if any([derived_sample.library is not None for derived_sample in self.derived_samples.all()]) else False

    @property
    def derived_sample_not_pool(self) -> DerivedSample:
        return self.derived_samples.first() if not self.is_pool else []  # Forces crash if pool

    @property
    def biosample_not_pool(self) -> Biosample:
        return self.derived_samples.first().biosample if not self.is_pool else None

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
        return self.coordinates if self.coordinates is not None else (self.container.coordinates if self.container else None)

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
        #return [derived_sample.project_id for derived_sample in self.derived_samples] if self.id else []
        queryset = self.derived_samples.filter(project__isnull=False).distinct("project")
        return [queryset.value_list("project", flat=True)] if queryset else []

    @property
    def source_depleted(self) -> bool:
        return self.extracted_from.depleted if self.extracted_from else None

    @property
    def extracted_from(self) -> "Sample":
        return self.child_of.filter(parent_sample__child=self, parent_sample__process_measurement__process__protocol__name="Extraction").first() if self.id else None

    @property
    def transferred_from(self) -> "Sample":
        return self.child_of.filter(parent_sample__child=self, parent_sample__process_measurement__process__protocol__name="Transfer").first() if self.id else None

    @property
    def concentration_as_nm(self) -> Decimal:
        if not self.is_library: # Calculation requires a library
            return None
        else:
            from fms_core.services.library import convert_library_concentration_from_ngbyul_to_nm
            concentration_as_nm, _, _ = convert_library_concentration_from_ngbyul_to_nm(self, self.concentration)
            return concentration_as_nm
    
    @property
    def quantity_in_ng(self) -> Decimal:
        return self.concentration * self.volume if self.concentration is not None else None

    @property
    def index_name(self) -> Optional[str]:
        return self.derived_samples.first().library.index.name if not self.is_pool and self.is_library else None

    @property
    def library_type(self) -> Optional[str]:
        return self.derived_samples.first().library.library_type.name if not self.is_pool and self.is_library else None

    @property
    def library_size(self) -> Decimal:
        return self.fragment_size

    @property
    def strandedness(self) -> Optional[str]:
        if self.is_pool: # Pools may contain multiple strandedness
            return None
        elif self.is_library:  # Library strandedness is defined during preparation
            return self.derived_samples.first().library.strandedness
        elif self.derived_samples.first().biosample.kind.same == "DNA": # Default strandedness of a DNA sample
            return DOUBLE_STRANDED
        elif self.derived_samples.first().biosample.kind.same == "RNA": # Default strandedness of an RNA sample
            return SINGLE_STRANDED
        else: # Otherwise it is likely a non-extracted sample.
            return None

    def matches_sample_type(self, sample_type: SampleType):
        if sample_type == SampleType.ANY:
            return True
        elif sample_type == SampleType.UNEXTRACTED_SAMPLE:
            return not self.is_kind_extracted
        elif sample_type == SampleType.EXTRACTED_SAMPLE:
            return self.is_kind_extracted and not self.is_library
        elif sample_type == SampleType.SAMPLE:
            return not self.is_library
        elif sample_type == SampleType.LIBRARY:
            return self.is_library
        elif sample_type == SampleType.POOLED_LIBRARY:
            return self.is_library and self.is_pool
        else:
            return False

    # Representations

    def __str__(self):
        return f"{self.name} {'extracted, ' if self.extracted_from else ''}" \
               f"({self.container}{f' at {self.coordinates}' if self.coordinates is not None else ''})"

    # ORM Methods

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)
        self.comment = str_cast_and_normalize(self.comment)
        self.volume = float_to_decimal(self.volume, 3)
        if self.concentration:
            self.concentration = float_to_decimal(self.concentration, 3)

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        # Check volume value
        if self.volume is not None and self.volume < Decimal("0"):
            add_error("volume", "Current volume must be positive.")

        # Set depleted when volume = 0
        if self.volume is not None and self.volume == Decimal("0"):
            self.depleted = True

        if self.fragment_size and self.fragment_size < 0:
            add_error("fragment_size", f"Fragment size must be a positive number.")

        # Make sure the creation date is not in the future 
        if is_date_or_time_after_today(self.creation_date):
            add_error("creation_date", f'creation_date ({self.creation_date}) cannot be after the current date.')

        # Validate container consistency
        if self.container_id is not None:
            parent_spec = CONTAINER_KIND_SPECS[self.container.kind]

            #  - Validate that parent can hold samples
            if not parent_spec.sample_holding:
                add_error("container", f"Parent container kind {parent_spec.container_kind_id} cannot hold samples")

            #  - Validate coordinates against parent container spec
            if not errors.get("container"):
                if parent_spec.requires_coordinates:
                    if self.coordinate is not None:
                        # Validate coordinates against parent container spec (coordinate exists but might not belong to that spec).
                        try:
                            parent_spec.validate_and_normalize_coordinates(self.coordinate.name)
                        except CoordinateError as e:
                            add_error("coordinate", str(e))
                    else:
                        add_error("container", f"Parent container of kind {self.container.kind} requires coordinates.")
                elif self.coordinate is not None:
                    add_error("container", f"Parent container of kind {self.container.kind} does not require coordinates.")   

            # TODO: This isn't performant for bulk ingestion
            # - Check for coordinate overlap with existing child containers of the parent
            if not errors.get("container") and not parent_spec.coordinate_overlap_allowed:
                #TODO Exceptions should not be used for normal processing flow. In this case, we expect
                # that Sample.DoesNotExist will be thrown if everything is okay (the normal case). 
                # This should be refactored to use a "do_coordinates_overlap" function that returns a value, rather than throwing.
                # Using exceptions like this makes debugging difficult, since the exception stops the
                # debugger constantly.
                try:
                    check_coordinate_overlap(self.container.samples, self, self.container, obj_type="sample")
                except CoordinateError as e:
                    add_error("coordinate", str(e))
                except Sample.DoesNotExist:
                    # Fine, the coordinates are free to use.
                    pass

        if self.is_pool and self.is_library:
            if any([derived_sample.library is None for derived_sample in self.derived_samples.all()]):
                add_error("Library of pools", f"Trying to create a pool of libraries with samples that are not libraries. ")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
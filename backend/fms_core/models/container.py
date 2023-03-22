import reversion

from django.core.exceptions import ValidationError
from django.db import models

from ..containers import (
    CONTAINER_KIND_SPECS,
    CONTAINER_KIND_CHOICES,
    PARENT_CONTAINER_KINDS,
)
from ..coordinates import CoordinateError, check_coordinate_overlap
from ..utils import str_cast_and_normalize

from .tracked_model import TrackedModel
from .coordinate import Coordinate

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._utils import add_error as _add_error
from ._validators import name_validator, container_barcode_validator

__all__ = ["Container"]


@reversion.register()
class Container(TrackedModel):
    """ Class to store information about a sample. """

    # TODO: Model for choices?
    kind = models.CharField(max_length=30,
                            choices=CONTAINER_KIND_CHOICES,
                            help_text="What kind of container this is. Dictates the coordinate system and other container-specific properties.")
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="Name for the container.",
                            validators=[name_validator])
    barcode = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Unique container barcode.",
                               validators=[container_barcode_validator])
    # In which container is this container located? i.e. its parent.
    location = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name="children",
                                 help_text="An existing (parent) container this container is located inside of.",
                                 limit_choices_to={"kind__in": PARENT_CONTAINER_KINDS})
    coordinate = models.ForeignKey(Coordinate, null=True, blank=True, on_delete=models.PROTECT, related_name="containers", 
                                   help_text="Coordinates of this container within the parent container.")
    comment = models.TextField(blank=True, help_text="Other relevant information about the container.")
    update_comment = models.TextField(blank=True, help_text="Comment describing the latest updates made to the container. Change this whenever updates are made.")

    @property
    def coordinates(self) -> str:
        return self.coordinate.name if self.coordinate is not None else None

    def __str__(self):
        return self.barcode

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.kind = str_cast_and_normalize(self.kind).lower() if self.kind is not None else ""
        self.name = str_cast_and_normalize(self.name)
        self.barcode = str_cast_and_normalize(self.barcode)
        self.comment = str_cast_and_normalize(self.comment)
        self.update_comment = str_cast_and_normalize(self.update_comment)

    def clean(self, check_regexes: bool = False):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        if self.coordinate is not None and self.location is None:
            add_error("coordinate", "Cannot specify coordinates in non-specified container")

        if self.location is not None:
            if self.location.barcode == self.barcode:
                add_error("location", "Container cannot contain itself")
            else:
                parent_spec = CONTAINER_KIND_SPECS[self.location.kind]
                # Validate that this container is allowed to be located in the parent container specified
                if not parent_spec.can_hold_kind(self.kind):
                    add_error("location",
                              f"Parent container kind {parent_spec.container_kind_id} cannot hold container kind {self.kind}")

                if not errors.get("coordinate") and not errors.get("location"):
                    if parent_spec.requires_coordinates:
                        if self.coordinate is not None:
                            # Validate coordinates against parent container spec (coordinate exists but might not belong to that spec).
                            try:
                                parent_spec.validate_and_normalize_coordinates(self.coordinate.name)
                            except CoordinateError as e:
                                add_error("coordinate", str(e))
                        else:
                            add_error("coordinate", f"Parent container of kind {self.location.kind} requires coordinates.")
                    elif self.coordinate is not None:
                        add_error("coordinate", f"Parent container of kind {self.location.kind} does not require coordinates.")

                        

                if not errors.get("coordinate") and not errors.get("location") and not parent_spec.coordinate_overlap_allowed:
                    # Check for coordinate overlap with existing child containers of the parent
                    try:
                        check_coordinate_overlap(self.location.children, self, self.location)
                    except CoordinateError as e:
                        add_error("coordinate", str(e))
                    except Container.DoesNotExist:
                        # Fine, the coordinates are free to use.
                        pass

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object

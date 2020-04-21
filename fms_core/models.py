import re
import reversion

from datetime import datetime
from decimal import Decimal
from django.contrib.postgres.fields import JSONField
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from typing import Optional

from .containers import (
    CONTAINER_SPEC_TUBE,
    CONTAINER_SPEC_TUBE_RACK_8X12,
    CONTAINER_KIND_SPECS,
    CONTAINER_KIND_CHOICES,
    SAMPLE_CONTAINER_KINDS,
    PARENT_CONTAINER_KINDS,
)
from .coordinates import CoordinateError, check_coordinate_overlap
from .schema_validators import JsonSchemaValidator, VOLUME_SCHEMA, EXPERIMENTAL_GROUP
from .utils import str_normalize


__all__ = [
    "create_volume_history",

    "Container",
    "ContainerMove",
    "Sample",
    "ExtractedSample",
    "SampleUpdate",
    "Individual",
]


def create_volume_history(update_type: str, volume_value: str, extracted_sample_id: Optional[str] = None):
    if update_type not in ("extraction", "update"):
        raise ValueError(f"Invalid update type {update_type}")

    if update_type == "extraction" and not extracted_sample_id:
        raise ValueError("Must specify sample ID for extraction")

    return {
        "update_type": update_type,
        "volume_value": str(Decimal(volume_value)),
        "date": datetime.utcnow().isoformat() + "Z",
        **({"extracted_sample_id": extracted_sample_id} if extracted_sample_id else {})
    }


def add_error(errors: dict, field: str, error: ValidationError):
    errors[field] = [*errors.get(field, []), error]


barcode_name_validator = RegexValidator(re.compile(r"^[a-zA-Z0-9.-_]+$"))


@reversion.register()
class Container(models.Model):
    """ Class to store information about a sample. """
    # TODO class for choices
    kind = models.CharField(
        max_length=20,
        choices=CONTAINER_KIND_CHOICES,
        help_text="What kind of container this is. Dictates the coordinate system and other container-specific "
                  "properties."
    )
    # TODO: Trim and normalize any incoming values to prevent whitespace-sensitive names
    name = models.CharField(unique=True, max_length=200, help_text="Unique name for the container.",
                            validators=[barcode_name_validator])
    barcode = models.CharField(primary_key=True, max_length=200, help_text="Unique container barcode.",
                               validators=[barcode_name_validator])

    # In which container is this container located? i.e. its parent.
    location = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name="children",
                                 help_text="An existing (parent) container this container is located inside of.",
                                 limit_choices_to={"kind__in": PARENT_CONTAINER_KINDS})

    # Where in the parent container is this container located, if relevant?
    coordinates = models.CharField(max_length=20, blank=True,
                                   help_text="Coordinates of this container within the parent container.")
    comment = models.TextField(blank=True)

    def __str__(self):
        return self.barcode

    def clean(self):
        errors = {}

        if self.coordinates != "" and self.location is None:
            add_error(errors, "coordinates", ValidationError("Cannot specify coordinates in non-specified container"))

        if self.location is not None:
            if self.location.barcode == self.barcode:
                add_error(errors, "location", ValidationError("Container cannot contain itself"))

            else:
                parent_spec = CONTAINER_KIND_SPECS[self.location.kind]

                # Validate that this container is allowed to be located in the parent container specified
                if not parent_spec.can_hold_kind(self.kind):
                    add_error(
                        errors,
                        "location",
                        ValidationError(f"Parent container kind {parent_spec.container_kind_id} cannot hold container "
                                        f"kind {self.kind}")
                    )

                if not errors.get("coordinates", None) and not errors.get("location", None):
                    # Validate coordinates against parent container spec
                    try:
                        self.coordinates = parent_spec.validate_and_normalize_coordinates(self.coordinates)
                    except CoordinateError as e:
                        add_error(errors, "coordinates", ValidationError(str(e)))

                if not errors.get("coordinates", None) and not errors.get("location", None) \
                        and not parent_spec.coordinate_overlap_allowed:
                    # Check for coordinate overlap with existing child containers of the parent
                    try:
                        check_coordinate_overlap(self.location.children, self, self.location)
                    except CoordinateError as e:
                        add_error(errors, "coordinates", ValidationError(str(e)))
                    except Container.DoesNotExist:
                        # Fine, the coordinates are free to use.
                        pass

        if errors:
            raise ValidationError(errors)


class ContainerMoveManager(models.Manager):
    # noinspection PyMethodMayBeStatic
    def get_queryset(self):
        return Container.objects.all()


class ContainerMove(Container):
    class Meta:
        proxy = True

    manager = ContainerMoveManager()


@reversion.register()
class Sample(models.Model):
    """ Class to store information about a sample. """

    BIOSPECIMEN_TYPE_DNA = "DNA"
    BIOSPECIMEN_TYPE_RNA = "RNA"
    BIOSPECIMEN_TYPE_BLOOD = "BLOOD"
    BIOSPECIMEN_TYPE_SALIVA = "SALIVA"

    NA_BIOSPECIMEN_TYPE_CHOICES = (
        (BIOSPECIMEN_TYPE_DNA, BIOSPECIMEN_TYPE_DNA),
        (BIOSPECIMEN_TYPE_RNA, BIOSPECIMEN_TYPE_RNA),
    )

    BIOSPECIMEN_TYPE_CHOICES = (
        *NA_BIOSPECIMEN_TYPE_CHOICES,
        (BIOSPECIMEN_TYPE_BLOOD, BIOSPECIMEN_TYPE_BLOOD),
        (BIOSPECIMEN_TYPE_SALIVA, BIOSPECIMEN_TYPE_SALIVA)
    )

    TISSUE_SOURCE_CHOICES = (
        ("Blood", "Blood"),
        ("Saliva", "Saliva"),
        ("Tumor", "Tumor"),
        ("Plasma", "Plasma"),
        ("Buffy coat", "Buffy coat"),
        ("Tail", "Tail"),
        ("Cells", "Cells"),
    )

    # TODO add validation if it's extracted sample then it can be of type DNA or RNA only
    biospecimen_type = models.CharField(max_length=200, choices=BIOSPECIMEN_TYPE_CHOICES)
    # TODO: Trim and normalize any incoming values to prevent whitespace-sensitive names
    name = models.CharField(max_length=200, validators=[barcode_name_validator])
    alias = models.CharField(max_length=200, blank=True)
    # TODO in case individual deleted should we set the value to default e.g. the individual record was deleted ?
    individual = models.ForeignKey('Individual', on_delete=models.PROTECT)

    volume_history = JSONField("volume history in µL", validators=[JsonSchemaValidator(VOLUME_SCHEMA)])

    # Concentration is REQUIRED if biospecimen_type in {DNA, RNA}.
    concentration = models.DecimalField(
        "concentration in ng/µL",
        max_digits=20,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Concentration in ng/µL. Required for nucleic acid samples."
    )

    depleted = models.BooleanField(default=False, help_text="Whether this sample has been depleted.")

    experimental_group = JSONField(blank=True, default=list, validators=[JsonSchemaValidator(EXPERIMENTAL_GROUP)])
    collection_site = models.CharField(max_length=200)
    tissue_source = models.CharField(max_length=200, blank=True, choices=TISSUE_SOURCE_CHOICES)
    reception_date = models.DateField(default=timezone.now)
    phenotype = models.CharField(max_length=200, blank=True)
    comment = models.TextField(blank=True)

    # In what container is this sample located?
    # TODO: I would prefer consistent terminology with Container if possible for this heirarchy
    container = models.ForeignKey(Container, on_delete=models.PROTECT, related_name="samples",
                                  limit_choices_to={"kind__in": SAMPLE_CONTAINER_KINDS})
    # Location within the container, specified by coordinates
    # TODO list of choices ?
    coordinates = models.CharField(max_length=10, blank=True,
                                   help_text="Coordinates of the sample in a parent container. Only applicable for "
                                             "containers that directly store samples with coordinates, e.g. plates.")

    # TODO Collection site (Optional but for big study, a choice list will be included in the Submission file) ?

    # fields only for extracted samples
    extracted_from = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT,
                                       related_name="extractions",
                                       help_text="The sample this sample was extracted from. Can only be specified for "
                                                 "extracted nucleic acid samples.")
    volume_used = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True,
                                      help_text="Volume of the original sample used for the extraction, in µL. Must "
                                                "be specified only for extracted nucleic acid samples.")

    class Meta:
        unique_together = ('container', 'coordinates')

    @property
    def is_depleted(self) -> str:
        return "yes" if self.depleted else "no"

    @property
    def volume(self) -> Decimal:
        return Decimal("{:.3f}".format(Decimal(self.volume_history[-1]["volume_value"])))

    def __str__(self):
        return f"{self.name} ({'extracted, ' if self.extracted_from else ''}" \
               f"{self.container}{f' at {self.coordinates }' if self.coordinates else ''})"

    def clean(self):
        errors = {}

        na_biospecimen_types = frozenset(c[0] for c in self.NA_BIOSPECIMEN_TYPE_CHOICES)

        biospecimen_type_choices = (Sample.NA_BIOSPECIMEN_TYPE_CHOICES if self.extracted_from
                                    else Sample.BIOSPECIMEN_TYPE_CHOICES)
        if self.biospecimen_type not in frozenset(c[0] for c in biospecimen_type_choices):
            add_error(
                errors,
                "biospecimen_type",
                ValidationError(f"Biospecimen type {self.biospecimen_type} not valid for"
                                f"{' extracted' if self.extracted_from else ''} sample {self.name}"),
            )

        if self.extracted_from:
            if self.extracted_from.biospecimen_type in na_biospecimen_types:
                add_error(
                    errors,
                    "extracted_from",
                    ValidationError(f"Extraction process cannot be run on sample of type "
                                    f"{self.extracted_from.biospecimen_type}")
                )

            if self.volume_used is None:
                add_error(errors, "volume_used", ValidationError("Extracted samples must specify volume_used"))

        if self.volume_used is not None and not self.extracted_from:
            add_error(errors, "volume_used", ValidationError("Non-extracted samples cannot specify volume_used"))

        # Check concentration fields given biospecimen_type

        if self.biospecimen_type in na_biospecimen_types and self.concentration is None:
            add_error(
                errors,
                "concentration",
                ValidationError("Concentration must be specified if the biospecimen_type is DNA or RNA")
            )

        # Check tissue source given extracted_from

        if self.tissue_source and self.biospecimen_type not in na_biospecimen_types:
            add_error(
                errors,
                "tissue_source",
                ValidationError("Tissue source can only be specified for a nucleic acid sample.")
            )

        # Validate container consistency

        if self.container_id is not None:
            parent_spec = CONTAINER_KIND_SPECS[self.container.kind]

            #  - Validate that parent can hold samples
            if not parent_spec.sample_holding:
                add_error(
                    errors,
                    "container",
                    ValidationError(f"Parent container kind {parent_spec.container_kind_id} cannot hold samples")
                )

            #  - Currently, extractions can only output tubes in a TUBE_RACK_8X12
            if self.extracted_from is not None and any((
                    parent_spec != CONTAINER_SPEC_TUBE,
                    self.container.location is None,
                    CONTAINER_KIND_SPECS[self.container.location.kind] != CONTAINER_SPEC_TUBE_RACK_8X12
            )):
                add_error(
                    errors,
                    "container",
                    ValidationError("Extractions currently must be conducted on a tube in an 8x12 tube rack")
                )

            #  - Validate coordinates against parent container spec
            if not errors.get("container"):
                try:
                    self.coordinates = parent_spec.validate_and_normalize_coordinates(self.coordinates)
                except CoordinateError as e:
                    add_error(errors, "container", ValidationError(str(e)))

            # TODO: This isn't performant for bulk ingestion
            # - Check for coordinate overlap with existing child containers of the parent
            if not errors.get("container", None) and not parent_spec.coordinate_overlap_allowed:
                try:
                    check_coordinate_overlap(self.container.samples, self, self.container, obj_type="sample")
                except CoordinateError as e:
                    add_error(errors, "container", ValidationError(str(e)))
                except Sample.DoesNotExist:
                    # Fine, the coordinates are free to use.
                    pass

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_normalize(self.name)
        self.alias = str_normalize(self.alias)
        self.collection_site = str_normalize(self.collection_site)
        self.tissue_source = str_normalize(self.tissue_source)
        self.phenotype = str_normalize(self.phenotype)
        self.comment = str_normalize(self.comment)
        self.full_clean()

        # Save the object
        super().save(*args, **kwargs)


class ExtractedSampleManager(models.Manager):
    # noinspection PyMethodMayBeStatic
    def get_queryset(self):
        return Sample.objects.filter(extracted_from__isnull=False)


class ExtractedSample(Sample):
    class Meta:
        proxy = True

    manager = ExtractedSampleManager()


class SampleUpdateManager(models.Manager):
    # noinspection PyMethodMayBeStatic
    def get_queryset(self):
        return Sample.objects.all()


class SampleUpdate(Sample):
    class Meta:
        proxy = True

    manager = SampleUpdateManager()


@reversion.register()
class Individual(models.Model):
    """ Class to store information about an Individual. """

    TAXON = (
        ('Homo sapiens', 'Homo sapiens'),
        ('Mus musculus', 'Mus musculus'),
    )

    SEX_MALE = "M"
    SEX_FEMALE = "F"
    SEX_UNKNOWN = "Unknown"

    SEX = (
        (SEX_MALE, SEX_MALE),
        (SEX_FEMALE, SEX_FEMALE),
        (SEX_UNKNOWN, SEX_UNKNOWN),
    )

    name = models.CharField(primary_key=True, max_length=200)
    taxon = models.CharField(choices=TAXON, max_length=20)
    sex = models.CharField(choices=SEX, max_length=10)
    pedigree = models.CharField(max_length=200, blank=True)
    mother = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name='mother_of')
    father = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name='father_of')
    # required ?
    cohort = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.name

    def clean(self):
        errors = {}

        if self.mother is not None and self.father is not None and self.mother == self.father:
            e = ValidationError("Mother and father IDs can't be the same.")
            add_error(errors, "mother", e)
            add_error(errors, "father", e)

        if self.mother and self.mother.name == self.name:
            add_error(errors, "mother", ValidationError("Mother can't be same as self."))

        if self.father and self.father.name == self.name:
            add_error(errors, "father", ValidationError("Father can't be same as self."))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_normalize(self.name)
        self.pedigree = str_normalize(self.pedigree)
        self.cohort = str_normalize(self.cohort)
        self.full_clean()
        # Save the object
        super().save(*args, **kwargs)

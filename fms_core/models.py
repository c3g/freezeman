import re
import reversion
import unicodedata

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
from .schema_validators import JsonSchemaValidator, VOLUME_SCHEMA


__all__ = [
    "create_volume_history",

    "Container",
    "Sample",
    "ExtractedSample",
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
        "date": datetime.utcnow().isoformat().replace("+00:00", "Z"),
        **({"extracted_sample_id": extracted_sample_id} if extracted_sample_id else {})
    }


def str_normalize(s: str):
    return unicodedata.normalize("NFC", s.strip())


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


@reversion.register()
class Sample(models.Model):
    """ Class to store information about a sample. """

    NA_BIOSPECIMEN_TYPE = (
        ("DNA", "DNA"),
        ("RNA", "RNA"),
    )

    BIOSPECIMEN_TYPE = (
        *NA_BIOSPECIMEN_TYPE,
        ("BLOOD", "BLOOD"),
        ("SALIVA", "SALIVA")
    )

    # TODO add validation if it's extracted sample then it can be of type DNA or RNA only
    biospecimen_type = models.CharField(max_length=200, choices=BIOSPECIMEN_TYPE)
    # TODO: Trim and normalize any incoming values to prevent whitespace-sensitive names
    name = models.CharField(max_length=200, validators=[barcode_name_validator])
    alias = models.CharField(max_length=200, blank=True)
    # TODO in case individual deleted should we set the value to default e.g. the individual record was deleted ?
    individual = models.ForeignKey('Individual', on_delete=models.PROTECT)

    volume_history = JSONField(validators=[JsonSchemaValidator(VOLUME_SCHEMA)])

    # Concentration is REQUIRED if biospecimen_type in {DNA, RNA}.
    concentration = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True,
                                        help_text="Concentration, ng/µL")

    depleted = models.BooleanField(default=False)

    experimental_group = JSONField(blank=True, null=True)
    collection_site = models.CharField(max_length=200)
    tissue_source = models.CharField(max_length=200, blank=True)
    reception_date = models.DateField(default=timezone.now)
    phenotype = models.CharField(max_length=200, blank=True)
    comment = models.TextField(blank=True)

    # In what container is this sample located?
    # TODO: I would prefer consistent terminology with Container if possible for this heirarchy
    container = models.ForeignKey(Container, on_delete=models.PROTECT, related_name="samples",
                                  limit_choices_to={"kind__in": SAMPLE_CONTAINER_KINDS})
    # Location within the container, specified by coordinates
    # TODO list of choices ?
    coordinates = models.CharField(max_length=10, blank=True)

    # TODO Collection site (Optional but for big study, a choice list will be included in the Submission file) ?

    # fields only for extracted samples
    extracted_from = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT,
                                       related_name="extractions")
    volume_used = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True)

    class Meta:
        unique_together = ['container', 'coordinates']

    @property
    def is_depleted(self) -> str:
        return "yes" if self.depleted else "no"

    @property
    def volume(self) -> Decimal:
        return Decimal("{:.3f}".format(Decimal(self.volume_history[-1]["volume_value"])))

    def __str__(self):
        return self.name

    def clean(self):
        errors = {}

        na_biospecimen_types = frozenset(c[0] for c in self.NA_BIOSPECIMEN_TYPE)

        biospecimen_type_choices = self.NA_BIOSPECIMEN_TYPE if self.extracted_from else self.BIOSPECIMEN_TYPE
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
        if not errors.get("container", None):
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


@reversion.register()
class Individual(models.Model):
    """ Class to store information about an Individual. """

    TAXON = (
        ('Homo sapiens', 'Homo sapiens'),
        ('Mus musculus', 'Mus musculus'),
    )

    SEX = (
        ('M', 'M'),
        ('F', 'F'),
        ('Unknown', 'Unknown'),
    )

    participant_id = models.CharField(primary_key=True, max_length=200)
    # required ?
    name = models.CharField(max_length=200, blank=True)
    taxon = models.CharField(choices=TAXON, max_length=20)
    sex = models.CharField(choices=SEX, max_length=10)
    pedigree = models.CharField(max_length=200, blank=True)
    mother = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name='mother_of')
    father = models.ForeignKey("self", blank=True, null=True, on_delete=models.PROTECT, related_name='father_of')
    # required ?
    cohort = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.participant_id

    def clean(self):
        errors = {}

        if self.mother is not None and self.father is not None and self.mother == self.father:
            e = ValidationError("Mother and father IDs can't be the same.")
            add_error(errors, "mother", e)
            add_error(errors, "father", e)

        if self.mother == self.participant_id:
            add_error(errors, "mother", ValidationError("Mother ID can't be the same as participant ID."))

        if self.father == self.participant_id:
            add_error(errors, "father", ValidationError("Father ID can't be the same as participant ID."))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize any string values to make searching / data manipulation easier
        self.participant_id = str_normalize(self.participant_id)
        self.name = str_normalize(self.participant_id)
        self.pedigree = str_normalize(self.pedigree)
        self.cohort = str_normalize(self.cohort)
        self.full_clean()
        # Save the object
        super().save(*args, **kwargs)

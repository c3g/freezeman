from django.db import models
import reversion
import unicodedata
from django.contrib.postgres.fields import JSONField
from django.core.exceptions import ValidationError
from .containers import CONTAINER_KIND_SPECS, CONTAINER_KIND_CHOICES, SAMPLE_CONTAINER_KINDS


def str_normalize(s: str):
    return unicodedata.normalize(s.strip(), "NFC")


@reversion.register()
class Container(models.Model):
    """ Class to store information about a sample. """
    # TODO class for choices
    kind = models.CharField(max_length=20, choices=CONTAINER_KIND_CHOICES)
    # TODO: Trim and normalize any incoming values to prevent whitespace-sensitive names
    name = models.CharField(unique=True, max_length=200)
    barcode = models.CharField(primary_key=True, max_length=200)

    # In which container is this container located? i.e. its parent.
    location = models.ForeignKey('self', null=True, on_delete=models.PROTECT)

    # Where in the parent container is this container located, if relevant?
    coordinates = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.barcode

    def clean(self):
        if self.coordinates != "" and self.location is None:
            raise ValidationError("Cannot specify coordinates in non-specified container")

        if self.location is None:
            # No more validation to do for parent containers
            return

        parent_spec = CONTAINER_KIND_SPECS[self.location.kind]

        if self.coordinates == "" and len(parent_spec.coordinate_spec) > 0:
            raise ValidationError(f"Must specify coordinates for parent container type {parent_spec.container_kind_id}")

        # TODO: Check for coordinate overlap if not allowed


@reversion.register()
class Sample(models.Model):
    """ Class to store information about a sample. """

    NA_BIOSPECIMEN_TYPE = (
        ('DNA', 'DNA'),
        ('RNA', 'RNA'),
    )

    BIOSPECIMEN_TYPE = (
        *NA_BIOSPECIMEN_TYPE,
        ('BLOOD', 'BLOOD'),
        ('SALIVA', 'SALIVA')
    )

    # TODO add validation if it's extracted sample then it can be of type DNA or RNA only
    biospecimen_type = models.CharField(max_length=200, choices=BIOSPECIMEN_TYPE)
    # TODO: Trim and normalize any incoming values to prevent whitespace-sensitive names
    name = models.CharField(primary_key=True, max_length=200)
    alias = models.CharField(max_length=200, blank=True)
    # TODO in case individual deleted should we set the value to default e.g. the individual record was deleted ?
    individual = models.ForeignKey('Individual', on_delete=models.PROTECT)

    # Volume and specimen are REQUIRED if biospecimen_type in {DNA, RNA}. Otherwise, they CANNOT BE SET.
    volume = models.CharField(max_length=200, blank=True, help_text="Volume, µL")
    concentration = models.CharField(max_length=200, blank=True, help_text="Concentration, ")

    depleted = models.BooleanField(default=False)

    experimental_group = JSONField(blank=True, null=True)
    collection_site = models.CharField(max_length=200)
    tissue_source = models.CharField(max_length=200, blank=True)
    reception_date = models.DateField()
    phenotype = models.CharField(max_length=200, blank=True)
    comment = models.TextField(blank=True)

    # In what container is this sample located?
    # TODO: I would prefer consistent terminology with Container if possible for this heirarchy
    container = models.ForeignKey(Container, on_delete=models.PROTECT,
                                  limit_choices_to={"kind__in": SAMPLE_CONTAINER_KINDS})
    # Location within the container, specified by coordinates
    # TODO list of choices ?
    coordinates = models.CharField(max_length=10, blank=True)

    # TODO Collection site (Optional but for big study, a choice list will be included in the Submission file) ?

    # fields only for extracted samples
    extracted_from = models.ForeignKey('self', blank=True, null=True, on_delete=models.PROTECT)
    volume_used = models.CharField(max_length=200)

    @property
    def is_depleted(self) -> str:
        return "yes" if self.depleted else "no"

    def __str__(self):
        return self.name

    def clean(self):
        self.biospecimen_type.choices = self.NA_BIOSPECIMEN_TYPE if self.extracted_from else self.BIOSPECIMEN_TYPE

        if self.biospecimen_type in ('DNA', 'RNA'):
            self.volume.blank = False
            self.concentration.blank = False

        elif self.volume != "":
            raise ValidationError("Volume cannot be specified if the biospecimen_type is not DNA or RNA")

        elif self.concentration != "":
            raise ValidationError("Concentration cannot be specified if the biospecimen_type is not DNA or RNA")

        if self.tissue_source and not self.extracted_from:
            raise ValidationError("Tissue source can only be specified for an extracted sample.")

        parent_spec = CONTAINER_KIND_SPECS[self.container.kind]

        if self.coordinates == "" and len(parent_spec.coordinate_spec) > 0:
            raise ValidationError(f"Must specify coordinates for sample in container type "
                                  f"{parent_spec.container_kind_id}")

    def save(self, *args, **kwargs):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_normalize(self.name)
        self.alias = str_normalize(self.alias)
        self.collection_site = str_normalize(self.collection_site)
        self.tissue_source = str_normalize(self.tissue_source)
        self.phenotype = str_normalize(self.phenotype)
        self.comment = str_normalize(self.comment)

        # Save the object
        super().save(*args, **kwargs)


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
    mother = models.ForeignKey('self', blank=True, null=True, on_delete=models.PROTECT, related_name='mother_of')
    father = models.ForeignKey('self', blank=True, null=True, on_delete=models.PROTECT, related_name='father_of')
    # required ?
    cohort = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.participant_id

    def clean(self):
        if self.mother is not None and self.father is not None and self.mother == self.father:
            raise ValidationError('Mother and father IDs can\'t be the same.')
        if self.mother == self.participant_id:
            raise ValidationError('Mother ID can\'t be the same as participant ID.')
        if self.father == self.participant_id:
            raise ValidationError('Father ID can\'t be the same as participant ID.')

    def save(self, *args, **kwargs):
        # Normalize any string values to make searching / data manipulation easier
        self.participant_id = str_normalize(self.participant_id)
        self.name = str_normalize(self.participant_id)
        self.pedigree = str_normalize(self.pedigree)
        self.cohort = str_normalize(self.cohort)

        # Save the object
        super().save(*args, **kwargs)

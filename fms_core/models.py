from django.db import models
import reversion
from django.contrib.postgres.fields import JSONField
from django.core.exceptions import ValidationError
from .containers import CONTAINER_KIND_CHOICES, SAMPLE_CONTAINER_KINDS


@reversion.register()
class Container(models.Model):
    """ Class to store information about a sample. """
    # TODO class for choices
    kind = models.CharField(max_length=20, choices=CONTAINER_KIND_CHOICES)
    # TODO: Trim and normalize any incoming values to prevent whitespace-sensitive names
    name = models.CharField(unique=True, max_length=200)
    barcode = models.CharField(primary_key=True, max_length=200)
    location_barcode = models.ForeignKey('self', on_delete=models.PROTECT)
    coordinates = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.barcode


@reversion.register()
class Sample(models.Model):
    """ Class to store information about a sample. """

    BIOSPECIMEN_TYPE = (
        ('DNA', 'DNA'),
        ('RNA', 'RNA'),
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
    volume = models.CharField(max_length=200)
    concentration = models.CharField(max_length=200, blank=True)
    experimental_group = JSONField(blank=True, null=True)
    # redundant ?
    container_barcode = models.ForeignKey(Container, on_delete=models.PROTECT,
                                          limit_choices_to={"kind__in": SAMPLE_CONTAINER_KINDS})
    location_barcode = models.CharField(max_length=200)
    # TODO list of choices ?
    location_coordinates = models.CharField(max_length=10)
    # TODO Collection site (Optional but for big study, a choice list will be included in the Submission file) ?
    collection_site = models.CharField(max_length=200)
    tissue_source = models.CharField(max_length=200, blank=True)
    reception_date = models.DateField()
    depletion = models.BooleanField(default=False)
    phenotype = models.CharField(max_length=200, blank=True)
    # fields only for extracted samples
    extracted_from = models.ForeignKey('self', blank=True, null=True, on_delete=models.PROTECT)
    volume_used = models.CharField(max_length=200)
    comment = models.TextField(blank=True)

    def __str__(self):
        return self.name

    def clean(self):
        if self.extracted_from:
            self.biospecimen_type.choices = (
                ('DNA', 'DNA'),
                ('RNA', 'RNA'),
            )

        if self.biospecimen_type in ('DNA', 'RNA'):
            self.concentration.blank = False

        if self.tissue_source and not self.extracted_from:
            raise ValidationError('Tissue source can only be specified for an extracted sample.')


@reversion.register()
class Individual(models.Model):
    """ Class to store information about an Individual. """

    TAXON = (
        ('Homo Sapiens', 'Homo Sapiens'),
        ('Mus Musculus', 'Mus Musculus')
    )
    GENDER = (
        ('M', 'M'),
        ('F', 'F'),
        ('Unknown', 'Unknown')
    )

    participant_id = models.CharField(primary_key=True, max_length=200)
    # required ?
    name = models.CharField(max_length=200, blank=True)
    taxon = models.CharField(choices=TAXON, max_length=20)
    # TODO both gender and sex ?
    gender = models.CharField(choices=GENDER, max_length=10)
    pedigree = models.CharField(max_length=200, blank=True)
    mother_id = models.ForeignKey('self', blank=True, null=True, on_delete=models.PROTECT,
                                  related_name='mother')
    father_id = models.ForeignKey('self', blank=True, null=True, on_delete=models.PROTECT,
                                  related_name='father')
    # required ?
    cohort = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.participant_id

    def clean(self):
        if self.mother_id and self.father_id and self.mother_id == self.father_id:
            raise ValidationError('Mother and father IDs can\'t be the same.')
        if self.mother_id == self.participant_id:
            raise ValidationError('Mother ID can\'t be the same as participant ID.')
        if self.father_id == self.participant_id:
            raise ValidationError('Father ID can\'t be the same as participant ID.')

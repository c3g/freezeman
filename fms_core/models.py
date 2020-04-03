from django.db import models
from django.contrib.postgres.fields import JSONField

from .containers import CONTAINER_KIND_CHOICES, SAMPLE_CONTAINER_KIND_CHOICES


class Container(models.Model):
    """ Class to store information about a sample. """
    # TODO class for choices
    kind = models.CharField(max_length=20, choices=CONTAINER_KIND_CHOICES)
    # TODO: Trim and normalize any incoming values to prevent whitespace-sensitive names
    name = models.CharField(unique=True)
    barcode = models.CharField(primary_key=True, max_length=200)
    location_barcode = models.ForeignKey('self', on_delete=models.PROTECT)
    coordinates = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.barcode


class Sample(models.Model):
    """ Class to store information about a sample. """

    BIOSPECIMEN_TYPE = (
        ('DNA', 'DNA'),
        ('RNA', 'RNA'),
        ('BLOOD', 'BLOOD'),
        ('SALIVA', 'SALIVA')
    )

    biospecimen_type = models.CharField(max_length=200, choices=BIOSPECIMEN_TYPE)
    # TODO: Trim and normalize any incoming values to prevent whitespace-sensitive names
    name = models.CharField(primary_key=True, max_length=200)
    alias = models.CharField(max_length=200, blank=True)
    # TODO in case individual deleted should we set the value to default e.g. the individual record was deleted ?
    individual = models.ForeignKey('Individual', on_delete=models.PROTECT)
    volume = models.CharField(max_length=200)
    concentration = models.CharField(max_length=200, blank=True)
    experimental_group = JSONField(blank=True, null=True)
    # only three types
    # redundant ?
    container_kind = models.CharField(max_length=20, choices=SAMPLE_CONTAINER_KIND_CHOICES)
    container_barcode = models.ForeignKey(Container, on_delete=models.PROTECT)
    location_barcode = models.CharField(max_length=200)
    # TODO list of choices ?
    location_coordinates = models.CharField(max_length=10)
    # TODO Collection site (Optional but for big study, a choice list will be included in the Submission file) ?
    collection_site = models.CharField(max_length=200)
    tissue_source = models.CharField(max_length=200, blank=True)
    reception_date = models.DateField()
    depletion = models.BooleanField(default=False)
    phenotype = models.CharField(max_length=200, blank=True)
    comment = models.TextField(blank=True)

    def __str__(self):
        return self.name

    def clean(self):
        if self.biospecimen_type in ('DNA', 'RNA'):
            self.concentration.blank = False


class Extraction(models.Model):
    """ Class to store information about Extraction from Sample. """

    EXTRACTION_TYPE = (
        ('DNA', 'DNA'),
        ('RNA', 'RNA')
    )

    # TODO primary key ???
    extraction_type = models.CharField(choices=EXTRACTION_TYPE)
    # 'This new sample is linked to the blood sample as a derivative'
    sample = models.ForeignKey(Sample, on_delete=models.PROTECT)
    volume_used = models.CharField(max_length=200)
    container_barcode = models.ForeignKey(Container, on_delete=models.PROTECT)
    # TODO Only 96 positions rack values
    location_coordinates = models.CharField(max_length=10)
    nucleic_acid_container_barcode = models.ForeignKey(Container, on_delete=models.PROTECT)
    # redundant field because we have FK
    # nucleic_acid_location_barcode
    # TODO Only 96 positions rack values
    nucleic_acid_location_coordinates = models.CharField(max_length=10)
    concentration = models.CharField(max_length=200, blank=True)
    source_depleted = models.BooleanField(default=False)
    comment = models.TextField(blank=True)

    def __str__(self):
        return self.id


class Individual(models.Model):
    """ Class to store information about an Individual. """

    TAXON = (
        ('Homo Sapiens', 'Homo Sapiens'),
        ('Mus Musculus', 'Mus Musculus')
    )
    GENDER = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Unknown', 'Unknown')
    )
    SEX = (
        ('M', 'M'),
        ('F', 'F'),
        ('Unknown', 'Unknown')
    )

    participant_id = models.CharField(primary_key=True, max_length=200)
    # required ?
    name = models.CharField(max_length=200, blank=True)
    taxon = models.CharField(choices=TAXON)
    # TODO both gender and sex ?
    gender = models.CharField(choices=GENDER)
    sex = models.CharField(choices=SEX)
    pedigree = models.CharField(max_length=200, blank=True)
    mother_id = models.ForeignKey('self', blank=True, null=True, on_delete=models.PROTECT)
    father_id = models.ForeignKey('self', blank=True, null=True, on_delete=models.PROTECT)
    # required ?
    cohort = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.participant_id


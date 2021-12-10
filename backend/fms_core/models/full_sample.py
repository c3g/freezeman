from django.db import models
from .container import Container
from .derived_sample import DerivedSample
from .biosample import Biosample
from .sample_kind import SampleKind
from .project import Project
from .sample import Sample
from .process_measurement import ProcessMeasurement
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField

__all__ = ["FullSample"]


class FullSample(models.Model):
    """ Class to provide information about a sample as a view. """
    sample_kind = models.ForeignKey(SampleKind, on_delete=models.DO_NOTHING, db_column='sample_kind_id',
                                    help_text="Biological material collected from study subject "
                                              "during the conduct of a genomic study project.")

    name = models.CharField(max_length=200, help_text="Sample name.")
    alias = models.CharField(max_length=200, help_text="Sample alias.")

    individual = models.ForeignKey("Individual", blank=True, null=True, on_delete=models.DO_NOTHING, help_text="Individual associated "
                                                                                     "with the sample.")

    volume = models.DecimalField(max_digits=20, decimal_places=3, help_text="Current volume of the sample, in µL. ")

    # Concentration is REQUIRED if sample kind name in {DNA}.
    concentration = models.DecimalField(
        "concentration in ng/µL",
        max_digits=20,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Concentration in ng/µL. Required for DNA."
    )

    depleted = models.BooleanField(default=False, help_text="Whether this sample has been depleted.")

    collection_site = models.CharField(max_length=200, help_text="The facility designated for the collection "
                                                                 "of samples.")
    tissue_source = models.CharField(max_length=200, blank=True,
                                     help_text="Can only be specified if the biospecimen type is DNA or RNA.")

    experimental_group = models.JSONField(blank=True, default=list,
                                          help_text="Sample group having some common characteristics. "
                                                    "It is the way to designate a subgroup within a study.")

    creation_date = models.DateField(help_text="Date of the sample reception or extraction.")

    # In what container is this sample located?
    container = models.ForeignKey(Container, on_delete=models.DO_NOTHING,
                                  help_text="Designated location of the sample.")
    # Location within the container, specified by coordinates
    coordinates = models.CharField(max_length=10, blank=True,
                                   help_text="Coordinates of the sample in a parent container. Only applicable for "
                                             "containers that directly store samples with coordinates, e.g. plates.")

    derived_sample = models.ForeignKey(DerivedSample, on_delete=models.DO_NOTHING, related_name="full_sample",
                                  help_text="Designated location of the sample.")

    quality_flag = models.BooleanField(choices=[(True, 'Passed'), (False, 'Failed')], null=True, blank=True,
                                       help_text='Quality flag of the sample.', max_length=20)

    quantity_flag = models.BooleanField(choices=[(True, 'Passed'), (False, 'Failed')], null=True, blank=True,
                                        help_text='Quantity flag of the sample.', max_length=20)

    biosample = models.ForeignKey(Biosample, on_delete=models.DO_NOTHING, related_name="samples",
                                          help_text="Designated location of the sample.")

    projects = ArrayField(models.CharField(blank=True, max_length=20))

    projects_names = ArrayField(models.CharField(blank=True, max_length=20))

    child_of = ArrayField(models.CharField(blank=True, max_length=20))

    process_measurements = ArrayField(models.CharField(blank=True, max_length=20))

    comment = models.CharField(blank=True, max_length=20)

    #Sample Tracking Information
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date the instance was created.")
    created_by = models.ForeignKey(User, null=False, blank=True, related_name="%(app_label)s_%(class)s_creation", on_delete=models.DO_NOTHING)
    updated_at = models.DateTimeField(auto_now=True, help_text="Date the instance was modified.")
    updated_by = models.ForeignKey(User, null=False, blank=True, related_name="%(app_label)s_%(class)s_modification", on_delete=models.DO_NOTHING)
    deleted = models.BooleanField(default=False, help_text="Whether this instance has been deleted.")

    @property
    def extracted_from(self) -> "Sample":
        return Sample.objects.get(pk=self.id).extracted_from

    class Meta:
        managed = False
        db_table = 'fms_core_fullsample'
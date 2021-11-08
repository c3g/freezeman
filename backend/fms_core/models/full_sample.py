from django.db import models
from .container import Container
from .derived_sample import DerivedSample
from .biosample import Biosample
from .sample_kind import SampleKind
from .project import Project
from .sample import Sample
from .process_measurement import ProcessMeasurement
from .tracked_model import TrackedModel

__all__ = ["FullSample"]


class FullSample(TrackedModel):
    """ Class to provide information about a sample as a view. """
    sample_kind = models.ForeignKey(SampleKind, on_delete=models.DO_NOTHING, db_column='sample_kind_id',
                                    help_text="Biological material collected from study subject "
                                              "during the conduct of a genomic study project.")
    name = models.CharField(max_length=200, help_text="Sample name.")
    individual = models.ForeignKey("Individual", blank=True, null=True, on_delete=models.DO_NOTHING, help_text="Individual associated "
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

    derived_sample = models.ForeignKey(DerivedSample, on_delete=models.DO_NOTHING, related_name="samples",
                                  help_text="Designated location of the sample.")

    biosample = models.ForeignKey(Biosample, on_delete=models.DO_NOTHING, related_name="samples",
                                          help_text="Designated location of the sample.")

    projects = models.ForeignKey(Project, on_delete=models.DO_NOTHING)

    child_of = models.ForeignKey(Sample, on_delete=models.DO_NOTHING)

    process_measurements = models.ForeignKey(ProcessMeasurement, on_delete=models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'fms_core_fullsample'
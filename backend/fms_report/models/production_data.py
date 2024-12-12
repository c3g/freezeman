from django.db import models

from fms_core.models._constants import STANDARD_NAME_FIELD_LENGTH
from fms_core.models import ExperimentRun, DerivedSample, Process, Biosample, Readset

__all__ = ["ProductionData"]

class ProductionData(models.Model):
    readset = models.OneToOneField(Readset, on_delete=models.PROTECT, related_name="production_data", help_text="Readset for current data row.")
    sequencing_date = models.DateField(help_text="Date the library was sequenced.")
    library_creation_date = models.DateField(null=True, blank=True, help_text="Date the library was created.")
    library_capture_date = models.DateField(null=True, blank=True, help_text="Date the library was captured.")
    run_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name of the sequencing run.")
    experiment_run = models.ForeignKey(ExperimentRun, on_delete=models.PROTECT, related_name="production_data", help_text="Experiment run for current data row.")
    experiment_container_kind = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Flowcell type used for the experiment.")
    lane = models.PositiveIntegerField(help_text="Sequencing run lane.")
    sample_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Sample name.")
    library = models.ForeignKey(DerivedSample, on_delete=models.PROTECT, related_name="production_data", help_text="Derived sample that defines a library.")
    library_batch = models.ForeignKey(Process, null=True, blank=True, on_delete=models.PROTECT, related_name="production_data", help_text="Process that generated the library.")
    is_internal_library = models.BooleanField(default=False, help_text="Flag that indicates that a library was created locally.")
    biosample = models.ForeignKey(Biosample, on_delete=models.PROTECT, related_name="production_data", help_text="Biosample used to generate the library.")
    library_type = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name of the library type.")
    library_selection = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name of the library selection protocol.")
    project = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name of the project.")
    project_external_id = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="External project ID.")
    principal_investigator = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Principal investigator of the project.")
    taxon = models.CharField(null=True, blank=True, max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Taxon scientific name.")
    technology = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Sequencing instrument type.")
    reads = models.BigIntegerField(help_text="Number of reads generated during sequencing.")
    bases = models.BigIntegerField(help_text="Number of bases read during sequencing.")

    class Meta:
        indexes = [
            models.Index(fields=['experiment_container_kind'], name='productiondata_flowcell_idx'),
            models.Index(fields=['sequencing_date'], name='productiondata_seqdate_idx'),
            models.Index(fields=['library_type'], name='productiondata_librarytype_idx'),
            models.Index(fields=['project'], name='productiondata_project_idx'),
            models.Index(fields=['technology'], name='productiondata_technology_idx'),
            models.Index(fields=['taxon'], name='productiondata_taxon_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=["experiment_run", "library", "lane"], name="productiondata_natural_key")
        ]

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
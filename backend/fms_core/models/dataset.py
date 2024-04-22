from typing import Optional
from django.db import models
from django.core.exceptions import ValidationError
import reversion
from django.contrib.contenttypes.fields import GenericRelation

from .tracked_model import TrackedModel
from .archived_comment import ArchivedComment

from ._constants import STANDARD_NAME_FIELD_LENGTH, STANDARD_FILE_PATH_LENGTH, ValidationStatus

@reversion.register()
class Dataset(TrackedModel):
    """ Class to store information about the datasets of data deliveries. """
    external_project_id = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="External project id.")
    project_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Human readable project name.")
    run_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Run name.")
    lane = models.PositiveIntegerField(help_text="Coordinates of the lane in a container")
    experiment_run = models.ForeignKey(blank=True, null=True, help_text='Experiment run matching the dataset.', on_delete=models.PROTECT, related_name='datasets', to='fms_core.experimentrun')
    metric_report_url = models.CharField(null=True, blank=True, max_length=STANDARD_FILE_PATH_LENGTH, help_text="URL to the run processing metrics report.")
    archived_comments = GenericRelation(ArchivedComment)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["external_project_id", "run_name", "lane"], name="dataset_externalprojectid_runname_lane_key")
        ]

    @property
    def validation_status(self) -> Optional[ValidationStatus]:
        readset = self.readsets.first()
        if readset:
            return readset.validation_status

    def clean(self):
        super().clean()
        
        errors = {}

        try:
            if self.lane != int(self.lane):
                raise Exception
        except Exception:
            errors["LaneError"] = f"Lane must be a positive integer, and yet it was given {self.lane}."
      
        if errors:
            raise ValidationError(errors)


    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
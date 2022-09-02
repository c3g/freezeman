from django.db import models
from django.core.exceptions import ValidationError
import reversion

from .tracked_model import TrackedModel
from .project import Project
from .experiment_run import ExperimentRun
from .container import Container

from ._constants import STANDARD_NAME_FIELD_LENGTH

@reversion.register()
class Dataset(TrackedModel):
    """ Class to store information about the datasets of data deliveries. """

    external_project_id = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="External project id.")

    run_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Run name.")

    lane = models.PositiveIntegerField(help_text="Coordinates of the lane in a container")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["external_project_id", "run_name", "lane"], name="dataset_externalprojectid_runname_lane_key")
        ]

    def clean(self):
        super().clean()
        
        errors = {}

        try:
            if self.lane != int(self.lane):
                raise Exception
        except Exception:
            errors["LaneError"] = f"Lane must be a positive integer, and yet it was given {self.lane}."
      
        if Dataset.objects.filter(external_project_id__iexact=self.external_project_id, run_name__iexact=self.run_name, lane=self.lane).exists():
            errors["ExistingError"] = f"There's already a dataset with identical external project id '{self.external_project_id}', run name '{self.run_name}' and lane '{self.lane}'"

        if errors:
            raise ValidationError(errors)


    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
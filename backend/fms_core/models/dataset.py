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

    project_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Project name.")

    run_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Run name.")

    lane = models.PositiveIntegerField(help_text="Coordinates of the lane in a container")

    def clean(self):
        super().clean()
        
        errors = {}

        try:
            if self.lane != int(self.lane):
                raise Exception
        except Exception:
            errors["LaneError"] = f"Lane must be a positive integer, and yet it was given {self.lane}."
      
        if Dataset.objects.filter(project_name__iexact=self.project_name, run_name__iexact=self.run_name, lane=self.lane).exists():
            errors["ExistingError"] = f"There's already a dataset with identical project name '{self.project_name}', run name '{self.run_name}' and lane '{self.lane}'"

        if errors:
            raise ValidationError(errors)


    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
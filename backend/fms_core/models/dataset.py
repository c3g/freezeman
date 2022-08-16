from django.db import models
from django.core.exceptions import ValidationError
import reversion

from .tracked_model import TrackedModel
from .project import Project
from .experiment_run import ExperimentRun
from .container import Container

from ._constants import STANDARD_NAME_FIELD_LENGTH

import re

positive_integer = re.compile(r"^[0-9]*[1-9][0-9]*$")

@reversion.register()
class Dataset(TrackedModel):
    """ Class to store information about the datasets of data deliveries. """

    project_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Project name.")

    run_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Run name.")

    lane = models.CharField(max_length=10, blank=True, help_text="Coordinates of the lane in a container")

    def clean(self):
        super().clean()
        
        errors = {}

        try:
            # is it a positive integer?
            if not positive_integer.match(self.lane):
                raise ValueError(f"The lane must be a positive integer")
        except ValueError as e:
            errors["ValueError"] = str(e)
        
        if Dataset.objects.filter(project_name__iexact=self.project_name, run_name__iexact=self.run_name, lane=self.lane).exists():
            errors["ExistingError"] = f"There's already a dataset with identical project name '{self.project_name}', run name '{self.run_name}' and lane '{self.lane}'"

        if errors:
            raise ValidationError(errors)


    def save(self, *args, **kwargs):
        self.clean()
        return super().save(*args, **kwargs)
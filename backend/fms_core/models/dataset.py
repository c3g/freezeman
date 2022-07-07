from django.db import models
import reversion

from .tracked_model import TrackedModel
from .project import Project
from .experiment_run import ExperimentRun
from .container import Container

from ._constants import STANDARD_NAME_FIELD_LENGTH

@reversion.register()
class Dataset(TrackedModel):
    """ Class to store information about the datasets of data deliveries. """

    # project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.PROTECT, help_text="The project the dataset belongs to")
    project_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Project name.")

    # run = models.ForeignKey(ExperimentRun, null=True, blank=True, on_delete=models.PROTECT, help_text="The experiment run in which the dataset was generated from")
    run_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Run name.")

    lane = models.CharField(max_length=10, blank=True, help_text="Coordinates of the lane in a container")

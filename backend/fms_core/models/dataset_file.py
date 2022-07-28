from django.db import models
import reversion

from .tracked_model import TrackedModel
from .dataset import Dataset
from .derived_sample import DerivedSample
from .container import Container

from ._constants import STANDARD_FILE_PATH_LENGTH, STANDARD_NAME_FIELD_LENGTH, ReleaseFlag

@reversion.register()
class DatasetFile(TrackedModel):
    """ Class to store information about the files associated with their dataset for data deliveries. """

    dataset = models.ForeignKey(Dataset, on_delete=models.PROTECT, help_text="The dataset of the file", related_name="files")
    file_path = models.CharField(max_length=STANDARD_FILE_PATH_LENGTH, help_text="Path to the dataset file")

    sample_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="The sample that corresponds with this file")

    release_flag = models.IntegerField(choices=ReleaseFlag.choices, default=ReleaseFlag.BLOCK, help_text="The release flag of the file.")
    release_flag_timestamp = models.DateTimeField(null=True, blank=True, help_text='The time release_flag was set to "Release".')
from django.db import models
import reversion

from .tracked_model import TrackedModel
from .dataset import Dataset
from .derived_sample import DerivedSample
from .container import Container

from ._constants import STANDARD_FILE_PATH_LENGTH, STANDARD_NAME_FIELD_LENGTH

@reversion.register()
class DatasetFile(TrackedModel):
    """ Class to store information about the files associated with their dataset for data deliveries. """

    dataset = models.ForeignKey(Dataset, on_delete=models.PROTECT, help_text="The dataset of the file", related_name="files")
    file_path = models.CharField(max_length=STANDARD_FILE_PATH_LENGTH, help_text="File path to the dataset")

    # derived_sample = models.ForeignKey(DerivedSample, null=True, blank=True, on_delete=models.PROTECT, help_text="The derived sample that correspond to the dataset")
    sample_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="The sample that corresponds with this file")

    released = models.BooleanField(default=True, help_text="Determines if the dataset file has been released or not.")
    qc_flag = models.IntegerField(choices=[(1, "Passed"), (2, "Failed"), (3, "Unknown")], default=3, help_text="The QC status of the file.")

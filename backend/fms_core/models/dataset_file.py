from django.db import models
import reversion

from .tracked_model import TrackedModel
from .readset import Readset

from ._constants import STANDARD_FILE_PATH_LENGTH, ReleaseStatus, ValidationStatus

@reversion.register()
class DatasetFile(TrackedModel):
    """ Class to store information about the files associated with their dataset for data deliveries. """

    readset = models.ForeignKey(Readset, on_delete=models.PROTECT, help_text="Readset of the file.", related_name="files")
    file_path = models.CharField(max_length=STANDARD_FILE_PATH_LENGTH, help_text="Path to the dataset file.")
    release_status = models.IntegerField(choices=ReleaseStatus.choices, default=ReleaseStatus.AVAILABLE, help_text="The release status of the file.")
    release_status_timestamp = models.DateTimeField(null=True, blank=True, help_text='The last time the release status of the file was changed.')
    validation_status = models.IntegerField(choices=ValidationStatus.choices, default=ValidationStatus.AVAILABLE, help_text="The run validation status of the file.")
    validation_status_timestamp = models.DateTimeField(null=True, blank=True, help_text='The last time the run validation status of the file was changed.')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["file_path"], name="Datasetfile_filepath_key")
        ]
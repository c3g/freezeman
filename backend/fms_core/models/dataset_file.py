from django.db import models
import reversion
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel
from .readset import Readset

from ._constants import STANDARD_FILE_PATH_LENGTH, ValidationStatus
from ._utils import add_error as _add_error

@reversion.register()
class DatasetFile(TrackedModel):
    """ Class to store information about the files associated with their dataset for data deliveries. """

    readset = models.ForeignKey(Readset, on_delete=models.PROTECT, help_text="Readset of the file.", related_name="files")
    file_path = models.CharField(null=False, max_length=STANDARD_FILE_PATH_LENGTH, help_text="Path to the dataset file.")
    size = models.IntegerField(null=False, help_text="Size of the dataset file.")
    validation_status = models.IntegerField(choices=ValidationStatus.choices, default=ValidationStatus.AVAILABLE, help_text="The run validation status of the file.")
    validation_status_timestamp = models.DateTimeField(null=True, blank=True, help_text='The last time the run validation status of the file was changed.')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["file_path"], name="Datasetfile_filepath_key")
        ]
    
    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.size <= 0:
            add_error("size", f"The size of the file must be greater than 0, but {self.size} was given.")

        if errors:
            raise ValidationError(errors)
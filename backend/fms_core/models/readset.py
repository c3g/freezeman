from django.db import models
import reversion

from django.core.exceptions import ValidationError
from .tracked_model import TrackedModel
from .dataset import Dataset

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error
from ._constants import STANDARD_NAME_FIELD_LENGTH, ReleaseStatus, ValidationStatus

@reversion.register()
class Readset(TrackedModel):
    """ Class to store information about the derived sample data extracted during a single run and lane. """
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="External name that identifies the readset if the run did not come from Freezeman.")
    dataset = models.ForeignKey(Dataset, on_delete=models.PROTECT, help_text="Dataset of the readset.", related_name="readsets")
    sample_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="Name that identifies the sample if the run did not come from Freezeman.")
    derived_sample = models.ForeignKey(blank=True, null=True, help_text='Derived sample matching the readset.', on_delete=models.PROTECT, related_name='readsets', to='fms_core.derivedsample')
    release_status = models.IntegerField(choices=ReleaseStatus.choices, default=ReleaseStatus.AVAILABLE, help_text="The release status of the file.")
    release_status_timestamp = models.DateTimeField(null=True, blank=True, help_text='The last time the release status of the file was changed.')
    validation_status = models.IntegerField(choices=ValidationStatus.choices, default=ValidationStatus.AVAILABLE, help_text="The run validation status of the file.")
    validation_status_timestamp = models.DateTimeField(null=True, blank=True, help_text='The last time the run validation status of the file was changed.')

    def __str__(self):
        return self.name

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)
        self.sample_name = str_cast_and_normalize(self.sample_name)

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
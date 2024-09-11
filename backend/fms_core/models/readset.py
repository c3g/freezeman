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
    released_by = models.ForeignKey(null=True, blank=True, help_text='User that released the readset data to the client.', on_delete=models.PROTECT, related_name='released_readsets', to='auth.user')
    validation_status = models.IntegerField(choices=ValidationStatus.choices, default=ValidationStatus.AVAILABLE, help_text="The run validation status of the file.")
    validation_status_timestamp = models.DateTimeField(null=True, blank=True, help_text='The last time the run validation status of the file was changed.')
    validated_by = models.ForeignKey(null=True, blank=True, help_text='User that validated the readset data.', on_delete=models.PROTECT, related_name='validated_readsets', to='auth.user')

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

        if self.release_status != ReleaseStatus.AVAILABLE and self.release_status_timestamp is None:
            add_error("release_status_timestamp", f"Release status timestamp required if status is not {ReleaseStatus.AVAILABLE.label}.")
        if self.validation_status != ValidationStatus.AVAILABLE and self.validation_status_timestamp is None:
            add_error("validation_status_timestamp", f"Validation status timestamp required if status is not {ValidationStatus.AVAILABLE.label}.")

        if self.release_status_timestamp is not None and self.released_by is None:
            add_error("released_by", f"The user that changed the release_status need to be recorded.")
        if self.release_status_timestamp is None and self.released_by is not None:
            add_error("released_by", f"Readset release status was never set. Cannot set released_by.")
        if self.validation_status_timestamp is not None and self.validated_by is None:
            add_error("validated_by", f"The user that changed the validation_status need to be recorded.")
        if self.validation_status_timestamp is None and self.validated_by is not None:
            add_error("validated_by", f"Readset validation status was never set. Cannot set validated_by.")

        self.normalize()

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
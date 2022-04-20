import reversion

from .tracked_model import TrackedModel
from django.db import models
from .sample import Biosample

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator


@reversion.register()
class SampleMetadata(TrackedModel):
    """ Class to store additional sample metadata. """

    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the metadata.")
    value = models.CharField(max_length=2000, help_text="The value of the metadata.")
    biosample = models.ForeignKey(Biosample, on_delete=models.PROTECT, related_name='metadata',
                                  help_text="Biosample associated to this metadata.")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["name", "biosample"], name="unique_metadata_name_by_biosample")
        ]

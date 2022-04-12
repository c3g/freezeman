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
                            help_text="The name of the property.")
    value = models.CharField(max_length=200, help_text="The value of the property.s")
    biosample = models.ForeignKey(Biosample, on_delete=models.PROTECT, related_name='metadata',
                                  help_text="Biosample associated to this property.")

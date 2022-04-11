import reversion

from .tracked_model import TrackedModel
from django.db import models
from .sample import Sample

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator


@reversion.register()
class SampleProperty(TrackedModel):
    """ Class to store additional sample metadata. """

    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the property.")
    value = models.CharField(max_length=200, help_text="The value of the property.s")
    sample = models.ForeignKey(Sample, on_delete=models.PROTECT, related_name='properties',
                                  help_text="Sample associated to this property.")

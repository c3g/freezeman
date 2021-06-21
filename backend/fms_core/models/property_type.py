import reversion

from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["PropertyType"]

VALUE_TYPE_CHOICES = ['TEXT', 'DECIMAL', 'BOOL']

@reversion.register()
class PropertyType(TrackedModel):
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="The name of the property",
                            validators=[name_validator])

    value_type = models.CharField(
        max_length=20,
        choices=((type, type) for type in VALUE_TYPE_CHOICES),
        help_text="Enumerated type to define text, decimal and bool values"
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
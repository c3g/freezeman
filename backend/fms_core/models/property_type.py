import reversion

from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator_with_spaces
from ._utils import add_error as _add_error

__all__ = ["PropertyType"]

VALUE_TYPE_CHOICES = ['int', 'float', 'bool', 'str']

@reversion.register()
class PropertyType(TrackedModel):
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, unique=True, validators=[name_validator_with_spaces],
                            help_text="The name of the property.")
    value_type = models.CharField(choices=((type, type) for type in VALUE_TYPE_CHOICES), max_length=20,
                                  help_text="Enumerated type to define value type.")
    is_optional = models.BooleanField(default=False, help_text="Whether this property is optional or not.")
    content_type_choices = models.Q(app_label = 'fms_core', model = 'protocol')
    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT, limit_choices_to=content_type_choices)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
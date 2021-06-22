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
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="The name of the property",
                            unique=True,
                            validators=[name_validator_with_spaces])

    value_type = models.CharField(
        max_length=20,
        choices=((type, type) for type in VALUE_TYPE_CHOICES),
        help_text="Enumerated type to define value type"
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')


    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))


        if self.content_object:
            # Check if the content_object is an instance of one of the permitted classes
            permitted_class_names = ['Protocol']
            content_object_class_name = self.content_object.__class__.__name__
            if content_object_class_name not in permitted_class_names:
                add_error("content_object", f"Object instance of {content_object_class_name} not permitted. Permitted classes are {permitted_class_names}")


        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
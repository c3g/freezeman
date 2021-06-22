import reversion

from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

from .tracked_model import TrackedModel
from .property_type import PropertyType

from ._utils import add_error as _add_error

from ..schema_validators import PROPERTY_VALUE_VALIDATOR

import json


__all__ = ["PropertyValue"]

@reversion.register()
class PropertyValue(TrackedModel):
    value = models.JSONField("Property value", validators=[PROPERTY_VALUE_VALIDATOR],
                                      help_text="Property value")
    property_type = models.ForeignKey(PropertyType, on_delete=models.PROTECT, related_name="property_type",
                                  help_text="Property type")

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.property_type:
            # Check if the property value data type matches the property type 'value_type' attribute
            value_type = type(self.value).__name__
            property_type_value_type = self.property_type.value_type
            if value_type != property_type_value_type:
                add_error("value", f"Value type {value_type} does not match property type {property_type_value_type}")

        if self.content_object:
            # Check if the content_object is an instance of one of the permitted classes
            permitted_class_names = ['Process', 'ProcessMeasurement']
            content_object_class_name = self.content_object.__class__.__name__
            if content_object_class_name not in permitted_class_names:
                add_error("content_object", f"Object instance of {content_object_class_name} not permitted. Permitted classes are {permitted_class_names}")


        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
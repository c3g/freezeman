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
    value = models.JSONField("Property value", blank=True, validators=[PROPERTY_VALUE_VALIDATOR], help_text="Property value.")
    property_type = models.ForeignKey(PropertyType, on_delete=models.PROTECT, related_name="property_values", help_text="Property type.")
    content_type_choices = models.Q(app_label='fms_core', model='process') | models.Q(app_label='fms_core', model='processmeasurement')
    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT, limit_choices_to=content_type_choices)
    object_id = models.BigIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.property_type:
            property_type_value_type = self.property_type.value_type

            # Exception applies to float values which might be entered as ints
            if property_type_value_type == 'float' and type(self.value).__name__ == 'int':
                self.value = float(self.value)

            # Checks for mandatory property
            if self.property_type.is_optional == False and self.value == '':
                add_error("value", f"Value for property {self.property_type.name} cannot be blank")
            # Check if the property value data type matches the property type 'value_type' attribute
            elif type(self.value).__name__ != property_type_value_type:
                add_error("value", f"Value type {type(self.value).__name__} does not match property type's value type {property_type_value_type}")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
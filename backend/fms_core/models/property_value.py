import reversion

from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


from .tracked_model import TrackedModel
from .property_type import PropertyType

from ._utils import add_error as _add_error

__all__ = ["PropertyValue"]

@reversion.register()
class PropertyValue(TrackedModel):
    value_text = models.TextField(null=True, blank=True, help_text="Property value")
    value_bool = models.BooleanField(null=True, blank=True, help_text="Property value")
    value_decimal = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True,
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


        count_present_values = 0
        for val in [self.value_text, self.value_bool, self.value_decimal]:
            if val is not None:
                count_present_values += 1

        if val == 0:
            add_error("value", "Value is missing")
        elif val > 1:
            add_error("value", "Multiple values were entered for different value (types) attributes")


        #TODO: check if PropertyType value type corresponds to the value field filled here


        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
import reversion

from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

from .tracked_model import TrackedModel

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

__all__ = ["ArchivedComment"]

@reversion.register()
class ArchivedComment(TrackedModel):
    content_type_choices = models.Q(app_label = 'fms_core', model = 'dataset')
    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT, limit_choices_to=content_type_choices)
    object_id = models.BigIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    comment = models.TextField(help_text="Comment to be archived.")

    def __str__(self):
        return self.comment

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.comment = str_cast_and_normalize(self.comment)


    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
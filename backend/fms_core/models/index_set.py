import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["IndexSet"]

@reversion.register()
class IndexSet(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the index set.")

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        index_set_similar_name = IndexSet.objects.filter(name__iexact=self.name).first()
        if index_set_similar_name and index_set_similar_name.id != self.id:
            add_error("name", f"Another index set with a similar name ({index_set_similar_name.name}) exists. Two index set names cannot be distinguished only by letter case.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
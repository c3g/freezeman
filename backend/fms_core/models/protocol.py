import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .protocolbysubprotocol import ProtocolBySubprotocol
from .tracked_model import TrackedModel

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

__all__ = ["Protocol"]


@reversion.register()
class Protocol(TrackedModel):
    name = models.CharField(max_length=200, unique=True, help_text="Unique identifier for the protocol.")

    child_of = models.ManyToManyField("self", blank=True, through="ProtocolBySubprotocol",
                                      symmetrical=False, related_name="parent_of")

    def __str__(self):
        return self.name

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)

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

    def get_protocols_dict(self):
        return {self: list(self.parent_of.all())}
import reversion

from django.core.exceptions import ValidationError
from django.db import models

from fms_core.models import Protocol, Platform
from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["RunType"]

@reversion.register()
class RunType(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="Name of the run type.",
                            validators=[name_validator])
    protocol = models.ForeignKey(Protocol, on_delete=models.PROTECT, related_name="run_types", help_text="Protocol used by the experiment run.")
    platform = models.ForeignKey(Platform, on_delete=models.PROTECT, related_name="run_types", help_text="Platform used by the run type.")


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

    @property
    def get_protocols_dict(self):
        return {self.protocol: list(self.protocol.child_of.all())}
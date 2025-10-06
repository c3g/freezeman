from typing import Any
from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel
from fms_core.schema_validators import PREFERENCES_VALIDATOR

from ._utils import add_error as _add_error

class Profile(TrackedModel):
    name = models.CharField(max_length=50, unique=True, help_text="Name of the profile (e.g. 'TechDev', 'Production Lab', username, etc.)")
    parent = models.ForeignKey("self", on_delete=models.PROTECT, blank=True, null=True)
    preferences = models.JSONField(default=dict, blank=True, help_text="Preferences stored as a JSON object")

    def final_preferences(self) -> dict[str, Any]:
        preferences = {}
        if self.parent:
            preferences.update(self.parent.final_preferences())
        if self.preferences:
            preferences.update(self.preferences)
        return preferences

    def clean(self) -> None:
        super().clean()

        errors = {}
        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        preferences = self.final_preferences()
        for error in PREFERENCES_VALIDATOR.validator.iter_errors(preferences):
            path = "".join(f'["{p}"]' for p in error.path)
            add_error("preferences", f"{path}: {error.message}" if error.path else error.message)
        
        if errors:
            raise ValidationError(errors)

    def __repr__(self) -> str:
        return super().__repr__() + f" (name={repr(self.name)})"
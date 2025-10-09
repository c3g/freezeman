from typing import Any
from django.db import models
from django.core.exceptions import ValidationError
import reversion

from .tracked_model import TrackedModel
from fms_core.schema_validators import PREFERENCES_VALIDATOR

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._utils import add_error as _add_error
from ._validators import name_validator_with_spaces

@reversion.register()
class Profile(TrackedModel):
    name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, unique=True, validators=[name_validator_with_spaces])
    parent = models.ForeignKey("self", on_delete=models.PROTECT, blank=True, null=True, related_name="children")
    preferences = models.JSONField(default=dict, help_text="Preferences stored as a JSON object")

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
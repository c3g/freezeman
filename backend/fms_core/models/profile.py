from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel
from fms_core.schema_validators import PREFERENCES_VALIDATOR
from fms_core.models.freezeman_user import FreezemanUser

from ._utils import add_error as _add_error

class Profile(TrackedModel):
    # TODO: somehow allow many user for each profile
    parent = models.ForeignKey("self", on_delete=models.PROTECT, blank=True, null=True)
    preferences = models.JSONField(blank=True, null=True)

    @property
    def username(self):
        return self.user.username

    def is_personalized(self):
        return bool(self.preferences)
    
    def final_preferences(self):
        preferences = dict[str, str]()
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

    def __repr__(self) -> str:
        return super().__repr__() + f" (user={self.user})"
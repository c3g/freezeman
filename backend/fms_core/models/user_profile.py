from django.db import models

from .tracked_model import TrackedModel
from fms_core.schema_validators import PREFERENCES_VALIDATOR
from fms_core.models.freezeman_user import FreezemanUser



class UserProfile(TrackedModel):
    user = models.OneToOneField(FreezemanUser, on_delete=models.PROTECT, related_name="user_profile")
    preferences = models.JSONField(blank=True, null=True, validators=[PREFERENCES_VALIDATOR])

    @property
    def username(self):
        return self.user.username

    def is_personalized(self):
        return bool(self.preferences)

    def __str__(self):
        return self.username
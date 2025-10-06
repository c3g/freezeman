from django.db import models
from django.conf import settings
import reversion

from fms_core.models.profile import Profile
from .tracked_model import TrackedModel

@reversion.register()
class FreezemanUser(TrackedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='freezeman_users')
    profile = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name='users')

    @property
    def username(self):
        return self.user.username

    def __repr__(self) -> str:
        return super().__repr__() + f" (user={repr(self.user)})"
from django.db import models
from django.conf import settings
import reversion

from fms_core.models.profile import Profile
from .tracked_model import TrackedModel

@reversion.register()
class FreezemanUser(TrackedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='freezeman_user')
    profile = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name='freezeman_users')
    permissions = models.ManyToManyField("FreezemanPermission", blank=True, through="FreezemanPermissionByUser", symmetrical=False, related_name="freezeman_users")

    @property
    def username(self):
        return self.user.username

    def __repr__(self) -> str:
        return f"FreezemanUser(user={repr(self.user)}, profile={repr(self.profile)})"
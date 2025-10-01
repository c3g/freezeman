from django.db import models
from django.contrib.auth.models import User
from .tracked_model import TrackedModel

class FreezemanUser(TrackedModel):
    user = models.OneToOneField(User, on_delete=models.PROTECT, related_name='freezeman_user')

    @property
    def username(self):
        return self.user.username

    def __str__(self):
        return self.username

    def __repr__(self) -> str:
        return super().__repr__() + f" (user={self.user})"
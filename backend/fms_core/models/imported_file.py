from django.contrib.auth.models import User
from django.db import models
from django.conf import settings

from .tracked_model import TrackedModel


__all__ = ["ImportedFile"]


class ImportedFile(TrackedModel):
    """ Model to store metadata about the imported file. """
    # 166 characters reserved in the filename length for the appended identifier
    filename = models.CharField(max_length=500)
    # 100 characters allocated to the path length itself
    location = models.CharField(max_length=600)
    added = models.DateTimeField(auto_now_add=True)
    imported_by = models.ForeignKey(null=True, on_delete=models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)

    def __str__(self):
        return str(self.id)

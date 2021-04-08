from django.contrib.auth.models import User
from django.db import models

from .tracked_model import TrackedModel


__all__ = ["ImportedFile"]


class ImportedFile(TrackedModel):
    """ Model to store metadata about the imported file. """
    # 166 characters reserved in the filename length for the appended identifier
    filename = models.CharField(max_length=500)
    # 100 characters allocated to the path length itself
    location = models.CharField(max_length=600)

    def __str__(self):
        return str(self.id)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

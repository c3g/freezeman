from django.contrib.auth.models import User
from django.db import models

__all__ = ["ImportedFile"]


class ImportedFile(models.Model):
    """ Model to store metadata about the imported file. """
    # 166 characters reserved in the filename length for the appended identifier
    filename = models.CharField(max_length=500)
    # 100 characters allocated to the path length itself
    location = models.CharField(max_length=600)
    added = models.DateTimeField(auto_now_add=True)
    imported_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)

    def __str__(self):
        return str(self.id)

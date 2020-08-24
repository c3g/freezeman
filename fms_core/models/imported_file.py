from django.contrib.auth.models import User
from django.db import models


__all__ = ["ImportedFile"]


class ImportedFile(models.Model):
    """ Model to store metadata about the imported file. """

    filename = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    added = models.DateTimeField(auto_now_add=True)
    imported_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)

    def __str__(self):
        return str(self.id)

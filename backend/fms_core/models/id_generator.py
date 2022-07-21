from django.db import models
from django.apps import apps

class IdGenerator(models.Model):
    """
    Class meant to manage the generation of unique IDs across the various request in an async manner.
    """
    id = models.BigAutoField(primary_key=True)
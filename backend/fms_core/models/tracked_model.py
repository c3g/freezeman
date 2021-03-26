from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

ADMIN_USER = "biobankadmin"

class TrackedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date the instance was created.")
    created_by = models.ForeignKey(User, null=True, related_name="%(app_label)s_%(class)s_creation", on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True, help_text="Date the instance was modified.")
    updated_by = models.ForeignKey(User, null=True, related_name="%(app_label)s_%(class)s_modification", on_delete=models.SET_NULL)
    deleted = models.BooleanField(default=False, help_text="Whether this instance has been deleted.")

    class Meta:
        abstract = True

    def clean(self):
        # if the instance has not been saved to the DB yet
        if not self.id:
            # initialize the user that create the object.
            self.created_by = request.user if request.user.is_authenticated else User.objects.get(username=ADMIN_USER)
        # Set modified by user each time we save
        self.updated_by = request.user if request.user.is_authenticated else User.objects.get(username=ADMIN_USER)

    def delete(self, using, keep_parents):
        # Set modified by user
        self.updated_by = request.user if request.user.is_authenticated else User.objects.get(username=ADMIN_USER)
        # Record the instance as deleted
        self.deleted = True
        # Save the instance to create a version
        super().save(*args, **kwargs)
        # Delete the instance from the table
        super().delete(using, keep_parents)

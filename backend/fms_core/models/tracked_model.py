from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from crum import get_current_user


class TrackedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date the instance was created.")
    created_by = models.ForeignKey(User, null=True, blank=True, related_name="%(app_label)s_%(class)s_creation", on_delete=models.PROTECT)
    updated_at = models.DateTimeField(auto_now=True, help_text="Date the instance was modified.")
    updated_by = models.ForeignKey(User, null=True, blank=True, related_name="%(app_label)s_%(class)s_modification", on_delete=models.PROTECT)
    deleted = models.BooleanField(default=False, help_text="Whether this instance has been deleted.")

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        user = get_current_user()
        if not user or (user and not user.pk):
            user = User.objects.get(username=ADMIN_USER)
        # if the instance has not been saved to the DB yet
        if not self.id:
            # initialize the user that create the object.
            self.created_by = user
        # Set modified by user each time we save
        self.updated_by = user

        super().save(*args, **kwargs)

    def delete(self, using, keep_parents):
        # Set modified by user
        user = get_current_user()
        if user and not user.pk:
            user = User.objects.get(username=ADMIN_USER)
        self.updated_by = user
        # Record the instance as deleted
        self.deleted = True
        # Save the instance to create a version
        super().save(*args, **kwargs)
        # Delete the instance from the table
        super().delete(using, keep_parents)

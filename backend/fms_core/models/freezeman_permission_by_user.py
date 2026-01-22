import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel

from ._utils import add_error as _add_error

@reversion.register()
class FreezemanPermissionByUser(TrackedModel):
    freezeman_permission = models.ForeignKey("FreezemanPermission", on_delete=models.PROTECT, related_name="users_by_permission")
    freezeman_user = models.ForeignKey("FreezemanUser", on_delete=models.PROTECT, related_name="permissions_by_user")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["freezeman_permission_id", "freezeman_user_id"], name="freezemanpermissionbyuser_permissionid_userid_key")
        ]

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
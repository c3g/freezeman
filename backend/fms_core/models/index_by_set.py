import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel
from ._utils import add_error as _add_error

__all__ = ["IndexBySet"]

@reversion.register()
class IndexBySet(TrackedModel):
    index = models.ForeignKey("Index", help_text="Index associated",
                              on_delete=models.PROTECT, related_name="index_set_association")
    index_set = models.ForeignKey("IndexSet", help_text="Index Set associated",
                                  on_delete=models.PROTECT, related_name="index_association")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["index_id", "index_set_id"], name="indexbyset_indexid_indexsetid_key")
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
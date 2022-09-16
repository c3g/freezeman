import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from ._utils import add_error as _add_error

__all__ = ["DerivedSampleByProject"]

@reversion.register()
class DerivedSampleByProject(TrackedModel):
    derived_sample = models.ForeignKey("DerivedSample", help_text="Derived Sample assigned to a project.",
                                       on_delete=models.PROTECT, related_name="project_association")
    project = models.ForeignKey("Project", help_text="Project to which the sample is associated.",
                                on_delete=models.PROTECT, related_name="derived_sample_association")
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["derived_sample", "project"], name="derivedsample_project_key")
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
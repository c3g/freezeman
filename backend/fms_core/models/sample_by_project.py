import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from ._utils import add_error as _add_error

__all__ = ["SampleByProject"]

@reversion.register()
class SampleByProject(TrackedModel):
    sample = models.ForeignKey("Sample", help_text="Sample assigned to a project.",
                              on_delete=models.CASCADE, related_name="project_association")
    project = models.ForeignKey("Project", help_text="Project to which the sample is associated.",
                               on_delete=models.CASCADE, related_name="sample_association")
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["sample", "project"], name="sample_by_project_unique")
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
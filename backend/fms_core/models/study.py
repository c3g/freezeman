import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .project import Project
from .workflow import Workflow
from .reference_genome import ReferenceGenome

from ._utils import add_error as _add_error

__all__ = ["Study"]


@reversion.register()
class Study(TrackedModel):
    letter = models.CharField(max_length=1, help_text="Letter ordinally chosen to identify a study.")
    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name="studies", help_text="Study project.")
    workflow = models.ForeignKey(Workflow, on_delete=models.PROTECT, related_name="studies", help_text="Workflow assigned to the study.")
    start = models.PositiveIntegerField(help_text="Index to the order of the start of the assigned workflow for this study.")
    end = models.PositiveIntegerField(help_text="Index to the order of the end of the assigned workflow for this study.")
    reference_genome = models.ForeignKey(ReferenceGenome, on_delete=models.PROTECT, related_name="studies", help_text="Reference genome used to analyze samples in the study.")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["letter", "project_id"], name="study_letter_projectid_key")
        ]

    def __str__(self):
        return "Study_" + self.letter

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
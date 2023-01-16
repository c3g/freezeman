import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .project import Project
from .workflow import Workflow

from ._utils import add_error as _add_error
from ._validators import study_letter_validator

__all__ = ["Study"]


@reversion.register()
class Study(TrackedModel):
    letter = models.CharField(max_length=1, help_text="Letter ordinally chosen to identify a study.", validators=[study_letter_validator])
    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name="studies", help_text="Study project.")
    workflow = models.ForeignKey(Workflow, on_delete=models.PROTECT, related_name="studies", help_text="Workflow assigned to the study.")
    start = models.PositiveIntegerField(help_text="Index to the order of the start of the assigned workflow for this study.")
    end = models.PositiveIntegerField(help_text="Index to the order of the end of the assigned workflow for this study.")

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

        if self.start and self.end and self.start > self.end:
            add_error("step_range", f"The start step of the workflow needs to have a lower or equal order than the end step.")

        if self.end and self.end > self.workflow.steps.count():
            add_error("step_range", f"The end step cannot be after the last step of the workflow.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
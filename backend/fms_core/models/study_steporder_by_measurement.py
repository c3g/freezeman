import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .step_order import StepOrder
from .process_measurement import ProcessMeasurement
from .study import Study

from ._utils import add_error as _add_error

__all__ = ["StudyStepOrderByMeasurement"]


@reversion.register()
class StudyStepOrderByMeasurement(TrackedModel):
    study = models.ForeignKey(Study, on_delete=models.PROTECT, related_name="StudyStepOrderByMeasurement", help_text="Study associated to the process measurement.")
    step_order = models.ForeignKey(StepOrder, on_delete=models.PROTECT, related_name="StudyStepOrderByMeasurement", help_text="Step order in the study that is associated to the process measurement.")
    process_measurement = models.ForeignKey(ProcessMeasurement, on_delete=models.PROTECT, related_name="StudyStepOrderByMeasurement", help_text="Process measurement associated to the study step.")
    

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["study", "step_order", "process_measurement"], name="studysteporderbymeasurement_study_steporder_processmeasurement_key")
        ]

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
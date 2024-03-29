import reversion

from django.core.exceptions import ValidationError
from django.db import models

from fms_core._constants import WorkflowAction

from .tracked_model import TrackedModel
from .step_order import StepOrder
from .sample import Sample
from .process_measurement import ProcessMeasurement
from .study import Study

from ._utils import add_error as _add_error

__all__ = ["StepHistory"]


@reversion.register()
class StepHistory(TrackedModel):
    study = models.ForeignKey(Study, on_delete=models.PROTECT, related_name="StepHistory", help_text="Study associated to the process measurement.")
    step_order = models.ForeignKey(StepOrder, on_delete=models.PROTECT, related_name="StepHistory", help_text="Step order in the study that is associated to the process measurement.")
    process_measurement = models.ForeignKey(ProcessMeasurement, null=True, blank=True, on_delete=models.PROTECT, related_name="StepHistory", help_text="Process measurement associated to the study step.")
    sample = models.ForeignKey(Sample, on_delete=models.PROTECT, related_name="StepHistory", help_text="Source sample that completed the step.")
    workflow_action = models.CharField(max_length=30,
                                       choices=WorkflowAction.choices,
                                       default=WorkflowAction.NEXT_STEP,
                                       help_text="Workflow action that was performed on the sample after step completion.")
    

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["study", "step_order", "process_measurement"], name="stephistory_study_steporder_processmeasurement_key")
        ]

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.process_measurement is None and self.step_order.step.protocol is not None:
            add_error("process_measurement", f"process_measurement required to create protocol step step_history.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from .experiment_type import ExperimentType
from .container import Container
from .instrument import Instrument

from ._utils import add_error as _add_error

__all__ = ["ExperimentRun"]


@reversion.register()
class ExperimentRun(TrackedModel):
    experiment_type = models.ForeignKey(ExperimentType, on_delete=models.PROTECT, related_name="experiment_runs", help_text="Experiment type")
    container = models.ForeignKey(Container, on_delete=models.PROTECT, related_name="experiment_runs", help_text="Container")
    instrument = models.ForeignKey(Instrument, on_delete=models.PROTECT, related_name="experiment_runs", help_text="Instrument")
    start_date = models.DateField(help_text="Date the run was started.")

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
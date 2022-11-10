import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from .run_type import RunType
from .container import Container
from .instrument import Instrument
from .process import Process

from ..containers import RUN_CONTAINER_KINDS

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["ExperimentRun"]


@reversion.register()
class ExperimentRun(TrackedModel):
    name = models.CharField(unique=True, blank=True, null=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="Name of the run.")
    run_type = models.ForeignKey(RunType,
                                 on_delete=models.PROTECT,
                                 related_name="experiment_runs",
                                 help_text="Run type")
    container = models.OneToOneField(Container,
                                     related_name="experiment_run",
                                     limit_choices_to={"kind__in": RUN_CONTAINER_KINDS},
                                     on_delete=models.PROTECT,
                                     help_text="Container")
    instrument = models.ForeignKey(Instrument,
                                   on_delete=models.PROTECT,
                                   related_name="experiment_runs",
                                   help_text="Instrument")
    start_date = models.DateField(help_text="Date the run was started.")
    process = models.ForeignKey(Process,
                                on_delete=models.PROTECT,
                                related_name="experiment_runs",
                                help_text="Main process associated to this experiment")
    run_processing_launch_date = models.DateField(null=True, help_text="Date on which run processing was launched, if it has been launched.")

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        # Validate that the container can run experiments
        if self.container_id is not None:
            if self.container.kind not in RUN_CONTAINER_KINDS:
                add_error("container", f"{self.container.kind} is not of a valid Experiment run container kind.")

        if errors:
            raise ValidationError(errors)


    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
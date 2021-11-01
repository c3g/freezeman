import reversion

from django.core.exceptions import ValidationError
from django.db import models

from fms_core.models import Protocol, Platform
from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["RunType"]

PROTOCOLS_BY_RUN_TYPE_NAME = {
    'Infinium Global Screening Array-24':
        { 'Illumina Infinium Preparation': [ 'Infinium: Amplification',
                                             'Infinium: Fragmentation',
                                             'Infinium: Precipitation',
                                             'Infinium: Hybridization',
                                             'Infinium: Wash Beadchip',
                                             'Infinium: Extend and Stain',
                                             'Infinium: Scan Preparation'
                                             ]
        }

}

@reversion.register()
class RunType(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="Name of the run type.",
                            validators=[name_validator])
    protocol = models.ForeignKey(Protocol, on_delete=models.PROTECT, related_name="run_types", help_text="Protocol used by the experiment run.")
    platform = models.ForeignKey(Platform, on_delete=models.PROTECT, related_name="run_types", help_text="Platform used by the run type.")


    def __str__(self):
        return self.name

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

    # REPLACE and move to procotol
    @property
    def get_protocols_dict(self):
        protocols_dict = {}

        exp_type_protocols = PROTOCOLS_BY_RUN_TYPE_NAME[self.name]
        for protocol_name in exp_type_protocols.keys():
            p = Protocol.objects.get(name=protocol_name)
            subprotocol_names = exp_type_protocols[protocol_name]
            protocols_dict[p] = list(Protocol.objects.filter(name__in=subprotocol_names))

        return protocols_dict
import reversion

from django.core.exceptions import ValidationError
from django.db import models

from fms_core.models import Protocol
from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["ExperimentType"]

PROTOCOLS_BY_EXPERIMENT_TYPE_NAME = {
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
class ExperimentType(TrackedModel):
    workflow = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="Placeholder for a future workflow model implementation.",
                            validators=[name_validator])

    def __str__(self):
        return self.workflow

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


    # This method should be moved out of ExperimentType when Workflows are implemented in FreezeMan
    @property
    def get_protocols_dict(self):
        protocols_dict = {}

        exp_type_protocols = PROTOCOLS_BY_EXPERIMENT_TYPE_NAME[self.workflow]
        for protocol_name in exp_type_protocols.keys():
            p = Protocol.objects.get(name=protocol_name)
            subprotocol_names = exp_type_protocols[protocol_name]
            subprotocols = []
            for subprotocol_name in subprotocol_names:
               subprotocols.append(Protocol.objects.get(name=subprotocol_name))
            protocols_dict[p] = subprotocols.copy()

        return protocols_dict
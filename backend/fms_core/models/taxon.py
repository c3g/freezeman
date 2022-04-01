import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

@reversion.register()
class Taxon(TrackedModel):
    name = models.CharField(max_length=200, unique=True,
                            help_text="Taxon scientific name.")
    ncbi_id = models.PositiveBigIntegerField(unique=True, help_text="Numerical identifier used by the NCBI taxonomy catalog.")
    
    def __str__(self):
        return self.name + " (NCBI:txid" + self.ncbi + ")"

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        self.normalize()

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.normalize()
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
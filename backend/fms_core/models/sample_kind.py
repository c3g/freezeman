import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

@reversion.register()
class SampleKind(TrackedModel):
    name = models.CharField(max_length=200, unique=True,
                            help_text="Biological material collected from study subject during the conduct of a genomic study project.")
    molecule_ontology_curie = models.CharField(max_length=20, blank=True,
                                               help_text="SO ontology term to describe a molecule, such as ‘SO:0000991’ (‘genomic_DNA’).")
    is_extracted = models.BooleanField(help_text="Indicator to identify kinds that were extracted. Sample will have tissue source.")
    concentration_required = models.BooleanField(help_text="Sample kind requires a concentration value for sample processing.")

    def __str__(self):
        return self.name

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








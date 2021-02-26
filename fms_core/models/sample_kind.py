import reversion

from django.db import models
from django.core.exceptions import ValidationError

from ..utils import str_cast_and_normalize
from ._utils import add_error as _add_error

@reversion.register()
class SampleKind(models.Model):
    name = models.CharField(max_length=200,
                            unique=True,
                            help_text="Biological material collected from study subject "
                                                  "during the conduct of a genomic study project.")
    molecule_ontology_curie = models.CharField( blank=True,
                                                help_text='SO ontology term to describe an molecule, such as ‘SO:0000991’ (‘genomic_DNA’)',
                                                max_length=20)

    def __str__(self):
        return self.name

    def normalize(self):
        # Normalize any string values to make searching / data manipulation easier
        self.name = str_cast_and_normalize(self.name)

    def clean(self):
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











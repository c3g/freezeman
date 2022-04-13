import reversion

from django.db import models
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel
from .library_type import LibraryType
from .platform import Platform
from .index import Index

from ._utils import add_error as _add_error
from ._constants import STRANDEDNESS_CHOICES, SINGLE_STRANDED, SSDNA_MW, DSDNA_MW

__all__ = ["Library"]

@reversion.register()
class Library(TrackedModel):
    library_type = models.ForeignKey(LibraryType, on_delete=models.PROTECT, related_name="libraries",
                                     help_text="Library type describing the library.")
    platform = models.ForeignKey(Platform, on_delete=models.PROTECT, related_name="libraries",
                                     help_text="The platform for which the library has been prepared.")
    index = models.ForeignKey(Index, on_delete=models.PROTECT, related_name="libraries",
                              help_text="The index associated to this library.")
    library_size = models.DecimalField(max_digits=20, decimal_places=0, null=True, blank=True,
                                        help_text="Average size of the nucleic acid strands in base pairs.")

    strandedness = models.CharField(choices=((type, type) for type in STRANDEDNESS_CHOICES), max_length=20,
                                    help_text="Number of Library NA strands.")

    @property
    def molecular_weight_approx(self) -> int:
        return SSDNA_MW if self.strandedness is SINGLE_STRANDED else DSDNA_MW
    
    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.library_size and self.library_size < 0:
            add_error("library_size", f"Library size must be a positive number.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
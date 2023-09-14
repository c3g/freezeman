import reversion

from django.db import models
from django.db.models.functions import Lower
from django.core.exceptions import ValidationError

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["IndexStructure"]

@reversion.register()
class IndexStructure(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the index structure.")

    flanker_3prime_forward = models.ForeignKey("Sequence", related_name="flanker_3prime_forward",
                                               on_delete=models.PROTECT, help_text="Flanker on the 3 prime forward direction")
    flanker_3prime_reverse = models.ForeignKey("Sequence", related_name="flanker_3prime_reverse",
                                               on_delete=models.PROTECT, help_text="Flanker on the 3 prime reverse direction")
    flanker_5prime_forward = models.ForeignKey("Sequence", related_name="flanker_5prime_forward",
                                               on_delete=models.PROTECT, help_text="Flanker on the 5 prime forward direction")
    flanker_5prime_reverse = models.ForeignKey("Sequence", related_name="flanker_5prime_reverse",
                                               on_delete=models.PROTECT, help_text="Flanker on the 5 prime reverse direction")

    class Meta:
        indexes = [
            models.Index(Lower("name"), name='indexstructure_ciname_idx'),
        ]

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if IndexStructure.objects.annotate(name_lower=Lower("name")).filter(name_lower=self.name.lower()).exclude(id=self.id).exists():
            add_error("name", f"Another index structure with a similar name exists. Two index structure names cannot be distinguished only by letter case.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object
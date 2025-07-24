import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from ._utils import add_error as _add_error
from ._constants import SEX_CHOICES, SEX_UNKNOWN

__all__ = ["SampleIdentity"]

@reversion.register()
class SampleIdentity(TrackedModel):
    SEX_CHOICES = SEX_CHOICES
    biosample = models.OneToOneField("Biosample", on_delete=models.PROTECT, related_name="sample_identity", help_text="Biosample for the identity.")
    conclusive = models.BooleanField(default=False, help_text="Flag indicating if the identity qc was conclusive.")
    predicted_sex = models.CharField(null=True, blank=True, choices=SEX_CHOICES, max_length=10, help_text="Sex of the sample.")
    identity_matches = models.ManyToManyField("SampleIdentity", through="SampleIdentityMatch", blank=True, symmetrical=True)

    @property
    def sex_concordance(self) -> bool | None:
        # True:   predicted_sex matches sex on individual (or individual sex unknown)
        # False:  predicted_sex mismatch with individual sex
        # None:   individual sex is None or predicted_sex is Unknown or None
        sex_concordance = None
        if self.biosample.individual.sex is not None and self.predicted_sex is not None and self.predicted_sex != SEX_UNKNOWN:
            sex_concordance = self.biosample.individual.sex == SEX_UNKNOWN or self.biosample.individual.sex == self.predicted_sex
        return sex_concordance

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

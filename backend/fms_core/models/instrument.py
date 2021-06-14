import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from .platform import Platform

from ._constants import STANDARD_NAME_FIELD_LENGTH
from ._validators import name_validator
from ._utils import add_error as _add_error

__all__ = ["Instrument"]

INSTRUMENT_MODEL_CHOICES = [
    "454 GS",
    "454 GS 20",
    "454 GS FLX",
    "454 GS FLX+",
    "454 GS FLX Titanium",
    "454 GS Junior",
    "HiSeq X Five",
    "HiSeq X Ten",
    "Illumina Genome Analyzer",
    "Illumina Genome Analyzer II",
    "Illumina Genome Analyzer IIx",
    "Illumina HiScanSQ",
    "Illumina HiSeq 1000",
    "Illumina HiSeq 1500",
    "Illumina HiSeq 2000",
    "Illumina HiSeq 2500",
    "Illumina HiSeq 3000",
    "Illumina HiSeq 4000",
    "Illumina iSeq 100",
    "Illumina MiSeq",
    "Illumina MiniSeq",
    "Illumina NovaSeq 6000",
    "NextSeq 500",
    "NextSeq 550",
    "PacBio RS",
    "PacBio RS II",
    "Sequel",
    "Ion Torrent PGM",
    "Ion Torrent Proton",
    "Ion Torrent S5",
    "Ion Torrent S5 XL",
    "AB 3730xL Genetic Analyzer",
    "AB 3730 Genetic Analyzer",
    "AB 3500xL Genetic Analyzer",
    "AB 3500 Genetic Analyzer",
    "AB 3130xL Genetic Analyzer",
    "AB 3130 Genetic Analyzer",
    "AB 310 Genetic Analyzer",
    "MinION",
    "GridION",
    "PromethION",
    "BGISEQ-500",
    "DNBSEQ-T7",
    "DNBSEQ-G400",
    "DNBSEQ-G50",
    "DNBSEQ-G400 FAST",
    "unspecified"
]


@reversion.register()
class Instrument(TrackedModel):
    platform = models.ForeignKey(Platform, on_delete=models.PROTECT, related_name="instruments", help_text="Platform")
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="Unique name for the instrument instance.",
                            validators=[name_validator])
    model = models.CharField(choices=tuple((i, i) for i in INSTRUMENT_MODEL_CHOICES),
                             max_length=STANDARD_NAME_FIELD_LENGTH,
                             help_text="The product make. Acceptable values are listed at the ENA: https:\/\/ena-docs.readthedocs.io/en/latest/submit/reads/webin-cli.html?highlight=library_strategy#permitted-values-for-instrument")

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
import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from ._constants import STANDARD_NAME_FIELD_LENGTH

PLATFORM_NAME_CHOICES = [
    "LS454",
    "ILLUMINA",
    "PACBIO_SMRT",
    "ION_TORRENT",
    "CAPILLARY",
    "OXFORD_NANOPORE",
    "BGISEQ",
    "DNBSEQ"
]


@reversion.register()
class Platform(TrackedModel):
    name = models.CharField(choices=tuple((i, i) for i in PLATFORM_NAME_CHOICES),
                            max_length=STANDARD_NAME_FIELD_LENGTH,
                            help_text="This technology used to measure the library. Acceptable values are listed at the ENA: https:\/\/ena-docs.readthedocs.io/en/latest/submit/reads/webin-cli.html?highlight=library_strategy#platform")

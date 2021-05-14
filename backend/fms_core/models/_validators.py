import re
from django.core.validators import RegexValidator
from ._constants import TEMPORARY_RENAME_SUFFIX

__all__ = ["name_validator",
           "container_barcode_validator"]

# Names should only contain a-z, A-Z, 0-9, ., -, _
# Barcodes can contain any character
name_validator = RegexValidator(re.compile(r"^[a-zA-Z0-9.\-_]{1,200}$"))
container_barcode_validator = RegexValidator(re.compile("^.{1,200}$"))

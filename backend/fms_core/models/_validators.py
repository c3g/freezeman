import re
from django.core.validators import RegexValidator
from ._constants import TEMPORARY_RENAME_SUFFIX

__all__ = ["name_validator",
           "container_barcode_validator"]

# Names should only contain a-z, A-Z, 0-9, ., -, _
# Barcodes can contain any character except "$" which is used internally for renaming of containers.
# They are capped at 200 characters by the field length inherently - but we limit them to
# one character less than that, since when renaming containers we need to append a
# temporary character to prevent integrity errors.
name_validator = RegexValidator(re.compile(r"^[a-zA-Z0-9.\-_]{1,199}$"))
container_barcode_validator = RegexValidator(re.compile("^[^\\" + TEMPORARY_RENAME_SUFFIX + "]{1,199}$"))

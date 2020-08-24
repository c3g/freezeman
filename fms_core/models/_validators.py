import re
from django.core.validators import RegexValidator

__all__ = ["barcode_name_validator"]

# Barcodes and names should only contain a-z, A-Z, 0-9, ., -, _
# They are capped at 200 characters by the field length inherently - but we limit them to
# one character less than that, since when renaming containers we need to append a
# temporary character to prevent integrity errors.
barcode_name_validator = RegexValidator(re.compile(r"^[a-zA-Z0-9.\-_]{1,199}$"))

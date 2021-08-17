import re
from django.core.validators import RegexValidator
from django.core.validators import EmailValidator
from ._constants import TEMPORARY_RENAME_SUFFIX

__all__ = ["name_validator",
           "name_validator_with_spaces",
           "container_barcode_validator",
           "email_validator"]

# Names should only contain a-z, A-Z, 0-9, ., -, _
# Barcodes can contain any character
name_validator = RegexValidator(re.compile(r"^[a-zA-Z0-9.\-_]{1,200}$"))
name_validator_with_spaces = RegexValidator(re.compile(r"^[a-zA-Z0-9.\-_ ]{1,200}$"))
container_barcode_validator = RegexValidator(re.compile("^[\S]{1,200}$"))
email_validator = EmailValidator()

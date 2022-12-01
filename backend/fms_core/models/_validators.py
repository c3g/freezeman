import re
from django.core.validators import RegexValidator
from django.core.validators import EmailValidator

__all__ = ["name_validator",
           "name_validator_with_spaces",
           "container_barcode_validator",
           "email_validator",
           "metadata_name_validator"]

# Names should only contain a-z, A-Z, 0-9, ., -, _
# Barcodes can contain any character
name_validator = RegexValidator(re.compile(r"^[a-zA-Z0-9.\-_]{1,200}$"))
name_validator_with_spaces = RegexValidator(re.compile(r"^[a-zA-Z0-9.\-_ ]{1,200}$"))
container_barcode_validator = RegexValidator(re.compile("^[\S]{1,200}$"))
email_validator = EmailValidator()
sequence_validator = RegexValidator(re.compile("^[ATCGU]{0,500}$"))
metadata_name_validator = RegexValidator(regex=re.compile(r"^(?!.*__)[a-zA-Z0-9.\-_]{1,200}$"),
                                         message="Double underscore i.e '__' are not allowed when naming metadata fields.")
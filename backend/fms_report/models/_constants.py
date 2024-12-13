from django.db import models

__all__ = [
    "REPORTING_NAME_FIELD_LENGTH",
    "AggregationType",
    "FieldDataType",
]

REPORTING_NAME_FIELD_LENGTH = 100

class AggregationType(models.TextChoices):
    SUM = "SUM", "Sum"
    COUNT = "COUNT", "Count"
    MAX = "MAX", "Max"
    MIN = "MIN", "Min"

class FieldDataType(models.TextChoices):
    BOOLEAN = "boolean", "Boolean"
    STRING = "string", "String"
    NUMBER = "number", "Number"
    DATE = "date", "Date"
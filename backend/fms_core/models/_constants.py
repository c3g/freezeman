from django.db import models

__all__ = ["STANDARD_NAME_FIELD_LENGTH"]

STANDARD_NAME_FIELD_LENGTH = 200
STANDARD_COORDINATE_NAME_FIELD_LENGTH = 10 # Leaving extra length for eventual containers with large number of positions
STANDARD_FILE_PATH_LENGTH = 4096
STANDARD_SEQUENCE_FIELD_LENGTH = 500
STANDARD_STRING_FIELD_LENGTH = 1000
PROJECT_STATUS_CHOICES = ["Open", "Closed"]
DOUBLE_STRANDED = 'Double stranded'
SINGLE_STRANDED = 'Single stranded'
STRANDEDNESS_CHOICES = [DOUBLE_STRANDED, SINGLE_STRANDED]
DSDNA_MW = 617.9
SSDNA_MW = DSDNA_MW / 2
INDEX_READ_FORWARD = "FORWARD"
INDEX_READ_REVERSE = "REVERSE"
INDEX_READ_DIRECTIONS_CHOICES = ((INDEX_READ_FORWARD, INDEX_READ_FORWARD), (INDEX_READ_REVERSE, INDEX_READ_REVERSE))

class ReleaseStatus(models.IntegerChoices):
    AVAILABLE = 0
    RELEASED = 1
    BLOCKED = 2

class ValidationStatus(models.IntegerChoices):
    AVAILABLE = 0
    PASSED = 1
    FAILED = 2

class SampleType(models.TextChoices):
    ANY = "ANY", "Any"
    UNEXTRACTED_SAMPLE = "UNEXTRACTED_SAMPLE", "Unextracted sample"
    EXTRACTED_SAMPLE = "EXTRACTED_SAMPLE", "Extracted sample"
    SAMPLE = "SAMPLE", "Sample"     # Not library implied
    LIBRARY = "LIBRARY", "Library"
    POOLED_LIBRARY = "POOL", "Pooled library"

class StepType(models.TextChoices):
    PROTOCOL = "PROTOCOL", "Protocol"
    AUTOMATION = "AUTOMATION", "Automation"
    INTEGRATION = "INTEGRATION", "Integration"
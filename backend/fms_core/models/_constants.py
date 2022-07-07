__all__ = ["STANDARD_NAME_FIELD_LENGTH"]

STANDARD_NAME_FIELD_LENGTH = 200
STANDARD_FILE_PATH_LENGTH = 4096
STANDARD_SEQUENCE_FIELD_LENGTH = 500
PROJECT_STATUS_CHOICES = ["Open", "Closed"]
DOUBLE_STRANDED = 'Double stranded'
SINGLE_STRANDED = 'Single stranded'
STRANDEDNESS_CHOICES = [DOUBLE_STRANDED, SINGLE_STRANDED]
DSDNA_MW = 617.9
SSDNA_MW = DSDNA_MW / 2
INDEX_READ_FORWARD = "FORWARD"
INDEX_READ_REVERSE = "REVERSE"
INDEX_READ_DIRECTIONS_CHOICES = ((INDEX_READ_FORWARD, INDEX_READ_FORWARD), (INDEX_READ_REVERSE, INDEX_READ_REVERSE))

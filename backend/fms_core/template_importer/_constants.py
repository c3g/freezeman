# Normalization planning
SAMPLE_BIOMEK_CHOICE = "Sample Biomek"
SAMPLE_JANUS_CHOICE = "Sample Janus"
GENOTYPING_BIOMEK_CHOICE = "Genotyping Biomek"
GENOTYPING_JANUS_CHOICE = "Genotyping Janus"
LIBRARY_CHOICE = "Library"
VALID_NORM_CHOICES = [GENOTYPING_BIOMEK_CHOICE, GENOTYPING_JANUS_CHOICE, SAMPLE_BIOMEK_CHOICE, SAMPLE_JANUS_CHOICE, LIBRARY_CHOICE]
# Index validation
DEFAULT_INDEX_VALIDATION_THRESHOLD = 2
INDEX_COLLISION_THRESHOLD = 0
# LOAD ALL SHORTHAND
LOAD_ALL = "ALL"
# QC Instruments
LIBRARY_QC_QUALITY_INSTRUMENTS = ["Caliper LabChip", "TapeStation"]
LIBRARY_QC_QUANTITY_INSTRUMENTS = ["qPCR", "Qubit"]
# Marker for destination container barcode
DESTINATION_CONTAINER_BARCODE_MARKER = "DESTINATION_CONTAINER_BARCODE => "
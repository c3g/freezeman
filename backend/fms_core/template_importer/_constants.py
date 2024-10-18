# Normalization planning
SAMPLE_TYPE = "Sample"
LIBRARY_TYPE = "Library"
GENOTYPING_TYPE = "Genotyping"
ROBOT_BIOMEK = "Biomek"
ROBOT_JANUS = "Janus"
VALID_ROBOT_CHOICES = [ROBOT_BIOMEK, ROBOT_JANUS]
# Index validation
DEFAULT_INDEX_VALIDATION_THRESHOLD = 2
INDEX_COLLISION_THRESHOLD = 0
# LOAD ALL SHORTHAND
LOAD_ALL = "ALL"
# QC Flags
PASSED = "Passed"
FAILED = "Failed"
VALID_QC_FLAG_CHOICES = [PASSED, FAILED]
# QC Instruments
LIBRARY_QC_QUALITY_INSTRUMENTS = ["Caliper LabChip", "TapeStation"]
SAMPLE_QC_QUALITY_INSTRUMENTS = ['Agarose Gel', 'TapeStation', 'NanoDrop', 'Caliper LabChip', 'Tecan Absorbance', 'BioAnalyzer']
LIBRARY_QC_QUANTITY_INSTRUMENTS = ["qPCR", "Qubit"]
# Marker for destination container barcode
DESTINATION_CONTAINER_BARCODE_MARKER = "DESTINATION_CONTAINER_BARCODE => "
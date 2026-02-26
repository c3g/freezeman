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
# Library qualifiers
STRANDEDNESS_CHOICES = ["Double stranded", "Single stranded"]
# QC Instruments
LIBRARY_QC_QUALITY_INSTRUMENTS = ["Caliper LabChip", "TapeStation", "Femto Pulse"]
SAMPLE_QC_QUALITY_INSTRUMENTS = ['Agarose Gel', 'TapeStation', 'NanoDrop', 'Caliper LabChip', 'Tecan Absorbance', 'BioAnalyzer']
SAMPLE_QC_QUANTITY_INSTRUMENTS = ['PicoGreen', 'Qubit', 'NanoDrop', 'Caliper LabChip', 'Tecan Absorbance', 'BioAnalyzer', 'TapeStation']
LIBRARY_QC_QUANTITY_INSTRUMENTS = ["qPCR", "Qubit"]
VALID_NON_INSTRUMENTS = ["N/A - WGS Tagmentation"]
# Marker for destination container barcode
DESTINATION_CONTAINER_BARCODE_MARKER = "DESTINATION_CONTAINER_BARCODE => "
# Index sets internaly used for library preparation - names do not match revamped set names.
INDEX_SETS_FOR_LIBRARY_PREPARATION = [
    "IDT 10nt UDI TruSeq Adapter Plate 1",
    "IDT 10nt UDI TruSeq Adapter Plate 2",
    "IDT 10nt UDI TruSeq Adapter Plate 3",
    "IDT 10nt UDI TruSeq Adapter Plate 4",
    "IDT UDI UMI 384",
    "Agilent SureSelect XT V2 96",
    "Agilent SureSelect XT V2 384",
    "MGIEasy PF Adapters",
    "MGIEasy UDB Primers Adapter Kit",
    "_10x_Genomics_scDNA_scRNA_V2_Linked_Reads",
    "_10x_Genomics_scRNA_V1",
    "_10x_Genomics_scATAC",
    "_10x_Genomics_Dual_Index_NT_Series",
    "NEBNext_Unique_Dual_Index_non_UMI_Set1_NEB_E6440",
    "NEBNext_Unique_Dual_Index_non_UMI_Set2_NEB_E6442",
    "NEBNext_Unique_Dual_Index_non_UMI_Set3_NEB_E6444",
    "NEBNext_Unique_Dual_Index_non_UMI_Set4_NEB_E6446",
    "Illumina_IDT_TruSeq_DNA_RNA_UD",
    "Illumina IDT Nextera UDP TAG Set A",
    "Illumina IDT Nextera UDP TAG Set B",
    "Illumina IDT Nextera UDP TAG Set C",
    "Illumina IDT Nextera UDP TAG Set D",
    "Illumina IDT Nextera UDP TAG Set A V3",
    "Illumina IDT Nextera UDP TAG Set B V3",
    "Illumina IDT Nextera UDP TAG Set C V3",
    "Illumina IDT Nextera UDP TAG Set D V3",
    "IDT_XGEN_UDI_UMI_Methylated",
    "IDT_XGEN_UDI_UMI_Methylated_Custom",
    "IDT_XGEN_UDI_UMI_Methylated_Order_18636890"
]

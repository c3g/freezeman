"""
Contains constants pointing to the paths of templates for template actions for
various viewsets. Can be used to calculate URIs for the template files too.
"""

from django.templatetags.static import static

__all__ = [
    "CONTAINER_CREATION_TEMPLATE",
    "CONTAINER_MOVE_TEMPLATE",
    "CONTAINER_RENAME_TEMPLATE",
    "EXPERIMENT_INFINIUM_TEMPLATE",
    "EXPERIMENT_ILLUMINA_TEMPLATE",
    "INDEX_CREATION_TEMPLATE",
    "LIBRARY_CAPTURE_TEMPLATE",
    "LIBRARY_CONVERSION_TEMPLATE",
    "LIBRARY_PREPARATION_TEMPLATE",
    "LIBRARY_QC_TEMPLATE",
    "NORMALIZATION_TEMPLATE",
    "SAMPLE_METADATA_TEMPLATE",
    "SAMPLE_EXTRACTION_TEMPLATE",
    "SAMPLE_SUBMISSION_TEMPLATE",
    "SAMPLE_UPDATE_TEMPLATE",
    "SAMPLE_TRANSFER_TEMPLATE",
    "SAMPLE_QC_TEMPLATE",
    "SAMPLE_SELECTION_QPCR_TEMPLATE",
    "PROJECT_STUDY_LINK_SAMPLES_TEMPLATE",
    "MAX_HEADER_OFFSET"
]

MAX_HEADER_OFFSET = 20

CONTAINER_CREATION_TEMPLATE = {
  "identity": {"description": "Template to add containers", "file": static("submission_templates/Container_creation_v4_2_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerCreation',
          'headers': ['Container Kind', 'Container Name', 'Container Barcode', 'Parent Container Barcode',
                      'Parent Container Coordinates', 'Comment'],
          'batch': False,
      },],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [],
}

CONTAINER_MOVE_TEMPLATE = {
  "identity": {"description": "Template to move containers", "file": static("submission_templates/Container_move_v3_6_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerMove',
          'headers': ['Container Barcode to move', 'Dest. Location Barcode', 'Dest. Location Coord', 'Update Comment'],
          'batch': False,
      },],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("ContainerMove", "Container Barcode to move", "barcode", None),],
}

CONTAINER_RENAME_TEMPLATE = {
  "identity": {"description": "Template to rename containers", "file": static("submission_templates/Container_rename_v3_6_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerRename',
          'headers': ['Old Container Barcode', 'New Container Barcode', 'New Container Name', 'Update Comment'],
          'batch': False,
      },],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("ContainerRename", "Old Container Barcode", "barcode", None),],
}

# Extracted sheet info for experiment run because it is shared between all templates of this category
EXPERIMENT_RUN_TEMPLATE_SHEET_INFO = [
      {
          'name': 'Experiments',
          'headers': ['Experiment Name', 'Experiment Container Barcode', 'Experiment Container Kind',
                      'Instrument Name', 'Experiment Start Date', 'Comment'],
          'stitch_column': 'Experiment Name',
          'batch': True,
      },
      {
          'name': 'Samples',
          'headers': ['Experiment Name', 'Source Sample Name', 'Source Container Barcode', 'Source Container Coordinates', 'Source Sample Volume Used',
                      'Experiment Container Coordinates', 'Comment', 'Workflow Action'],
          'stitch_column': 'Experiment Name',
          'batch': False,
      },]

EXPERIMENT_INFINIUM_TEMPLATE = {
  "identity": {"description": "Template to add Infinium experiments",
               "file": static("submission_templates/Experiment_Infinium_24_v4_1_0.xlsx"),
               "protocol": "Illumina Infinium Preparation"},
  "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Samples", "Source Sample Name", "name", "name"),
      ("Samples", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("Samples", "Source Container Coordinates", "coordinate__name", "coordinates"),],
}

EXPERIMENT_MGI_TEMPLATE = {
  "identity": {"description": "Template to add MGI experiments",
               "file": static("submission_templates/Experiment_run_MGI_v4_1_0.xlsx"),
               "protocol": "DNBSEQ Preparation"},
  "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Samples", "Source Sample Name", "name", "name"),
      ("Samples", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("Samples", "Source Container Coordinates", "coordinate__name", "coordinates"),],
}

EXPERIMENT_ILLUMINA_TEMPLATE = {
  "identity": {"description": "Template to add Illumina experiments",
               "file": static("submission_templates/Experiment_run_illumina_v4_1_0.xlsx"),
               "protocol": "Illumina Preparation"},
  "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Samples", "Source Sample Name", "name", "name"),
      ("Samples", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("Samples", "Source Container Coordinates", "coordinate__name", "coordinates"),],
}

INDEX_CREATION_TEMPLATE = {
  "identity": {"description": "Template to create indices", "file": static("submission_templates/Index_creation_v3_7_0.xlsx")},
  "sheets info": [
      {
          'name': 'Indices',
          'headers': ['Set Name', 'Index Name', 'Index Structure', 'Index 3 Prime', 'Index 5 Prime'],
          'batch': False,
      },],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [],
}

LIBRARY_CAPTURE_TEMPLATE = {
  "identity": {"description": "Template to prepare captured libraries",
               "file": static("submission_templates/Library_capture_v4_1_0.xlsx"),
               "protocol": "Library Capture"},
  "sheets info": [
      {
          'name': 'Capture Batch',
          'headers': ['Capture Batch ID', 'Capture Type', 'Capture Date (YYYY-MM-DD)', 'Comment',
                      'Capture Technician Name', 'Library Kit Used', 'Library Kit Lot',
                      'Baits Used', 'Thermocycler Used', 'PCR Cycles', 'PCR Enzyme Used', 'PCR Enzyme Lot'],
          'stitch_column': 'Capture Batch ID',
          'batch': True,
      },
      {
          'name': 'Library',
          'headers': ['Capture Batch ID', 'Library Name', 'Source Container Barcode', 'Source Container Coordinates',
                      'Destination Container Barcode', 'Destination Container Coordinates',  'Destination Container Name',
                      'Destination Container Kind', 'Destination Parent Container Barcode', 'Destination Parent Container Coordinates',
                      'Source Volume Used (uL)', 'Destination Volume (uL)', 'Comment', 'Workflow Action'],
          'stitch_column': 'Capture Batch ID',
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Library", "Library Name", "name", "name"),
      ("Library", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("Library", "Source Container Coordinates", "coordinate__name", "coordinates"),],
}

LIBRARY_CONVERSION_TEMPLATE = {
  "identity": {"description": "Template to convert libraries",
               "file": static("submission_templates/Library_conversion_v4_1_0.xlsx"),
               "protocol": "Library Conversion"},
  "sheets info": [
      {
          'name': 'Conversion Batch',
          'headers': ['Library Batch ID', 'Date (YYYY-MM-DD)', 'Platform', 'Comment',
                      'Technician Name', 'Kit Used', 'Kit Lot', 'Thermocycler Used', 'PCR Cycles'],
          'stitch_column': 'Library Batch ID',
          'batch': True,
      },
      {
          'name': 'Library',
          'headers': ['Library Batch ID', 'Library Source Name', 'Library Source Container Barcode', 'Library Source Container Coordinates',
                      'Destination Library Container Barcode', 'Destination Library Container Coordinates',
                      'Destination Library Container Name', 'Destination Library Container Kind',
                      'Destination Library Parent Container Barcode', 'Destination Library Parent Container Coordinates',
                      'Library Source Concentration (ng/uL)', 'Library Size (bp)', 'Input used for conversion (ng)',
                      'Volume Used (uL)', 'Volume (uL)', 'Comment', 'Workflow Action'],
          'stitch_column': 'Library Batch ID',
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Library", "Library Source Name", "name", "name"),
      ("Library", "Library Source Container Barcode", "container__barcode", "container_barcode"),
      ("Library", "Library Source Container Coordinates", "coordinate__name", "coordinates"),
      ("Library", "Library Source Concentration (ng/uL)", "concentration", "concentration"),
      ("Library", "Library Size (bp)", "fragment_size", "library_size"),

  ],
}

LIBRARY_PREPARATION_TEMPLATE = {
  "identity": {"description": "Template to prepare libraries",
               "file": static("submission_templates/Library_preparation_v4_1_0.xlsx"),
               "protocol": "Library Preparation"},
  "sheets info": [
      {
          'name': 'Library Batch',
          'headers': ['Library Batch ID', 'Library Type', 'Library Date (YYYY-MM-DD)', 'Platform', 'Comment',
                      'Library Technician Name', 'Shearing Technician Name', 'Shearing Method', 'Shearing Size (bp)',
                      'Library Kit Used', 'Library Kit Lot', 'Thermocycler Used', 'PCR Cycles', 'PCR Enzyme Used',
                      'PCR Enzyme Lot', 'EZ-96 DNA Methylation-Gold MagPrep Lot'],
          'stitch_column': 'Library Batch ID',
          'batch': True,
      },
      {
          'name': 'Library',
          'headers': ['Library Batch ID', 'Sample Name', 'Sample Container Barcode', 'Sample Container Coordinates', 'Library Container Barcode',
                      'Library Container Coordinates',  'Library Container Name', 'Library Container Kind', 'Library Parent Container Barcode',
                      'Library Parent Container Coordinates', 'Sample Volume Used (uL)', 'Library Volume (uL)',
                      'Index Set', 'Index', 'Strandedness', 'Comment', 'Workflow Action'],
          'stitch_column': 'Library Batch ID',
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Library", "Sample Name", "name", "name"),
      ("Library", "Sample Container Barcode", "container__barcode", "container_barcode"),
      ("Library", "Sample Container Coordinates", "coordinate__name", "coordinates"),],
}

LIBRARY_QC_TEMPLATE = {
  "identity": {"description": "Template to perform library quality control",
               "file": static("submission_templates/Library_QC_v4_1_0.xlsx"),
               "protocol": "Library Quality Control"},
  "sheets info": [
      {
        'name': 'LibraryQC',
        'headers': ['Library Name', 'Library Container Barcode', 'Library Container Coord', 'Initial Volume (uL)',
                    'Measured Volume (uL)', 'Volume Used (uL)', 'Strandedness', 'Library size (bp)', 'Concentration (nM)',
                    'Concentration (ng/uL)', 'NA Quantity (ng)', 'Quality Instrument', 'Quality Flag',
                    'Quantity Instrument', 'Quantity Flag', 'QC Date (YYYY-MM-DD)', 'Comment', 'Workflow Action'],
        'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
    ("LibraryQC", "Library Name", "name", "name"),
    ("LibraryQC", "Library Container Barcode", "container__barcode", "container_barcode"),
    ("LibraryQC", "Library Container Coord", "coordinate__name", "coordinates"),
    ("LibraryQC", "Initial Volume (uL)", "volume", "volume"),
    ("LibraryQC", "Strandedness", "sample_strandedness", "strandedness"),
    ],
}

NORMALIZATION_TEMPLATE = {
  "identity": {"description": "Template to perform normalization",
               "file": static("submission_templates/Normalization_v4_1_0.xlsx"),
               "protocol": "Normalization"},
  "sheets info": [
      {
        'name': 'Normalization',
        'headers': ['Type', 'Sample Name', 'Source Container Barcode', 'Source Container Coord', 'Robot Source Container', 'Robot Source Coord',
                    'Destination Container Barcode', 'Destination Container Coord', 'Robot Destination Container', 'Robot Destination Coord',
                    'Destination Container Name', 'Destination Container Kind', 'Destination Parent Container Barcode',
                    'Destination Parent Container Coord', 'Source Depleted', 'Initial Conc. (ng/uL)', 'Volume Used (uL)', 'Volume (uL)',
                    'Conc. (ng/uL)', 'Conc. (nM)', 'Normalization Date (YYYY-MM-DD)', 'Comment', 'Workflow Action'],
        'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Normalization", "Sample Name", "name", "name"),
      ("Normalization", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("Normalization", "Source Container Coord", "coordinate__name", "coordinates"),
      ("Normalization", "Initial Conc. (ng/uL)", "concentration", "concentration"),
  ],
}

NORMALIZATION_PLANNING_TEMPLATE = {
  "identity": {"description": "Template to perform normalization planning",
               "file": static("submission_templates/Normalization_planning_v4_2_0.xlsx"),
               "protocol": "Normalization"},
  "sheets info": [
      {
        'name': 'Normalization',
        'headers': ['Robot Norm Choice', 'Sample Name', 'Source Container Barcode', 'Source Container Coord',
                    'Destination Container Barcode', 'Destination Container Coord', 'Destination Container Name', 'Destination Container Kind',
                    'Destination Parent Container Barcode', 'Destination Parent Container Coord', 'Norm. NA Quantity (ng)',
                    'Norm. Conc. (ng/uL)', 'Norm. Conc. (nM)', 'Final Volume (uL)'],
        'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Normalization", "Sample Name", "name", "name"),
      ("Normalization", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("Normalization", "Source Container Coord", "coordinate__name", "coordinates"),
  ],
}

SAMPLE_METADATA_TEMPLATE = {
  "identity": {"description": "Template to add metadata to samples", "file": static("submission_templates/Sample_metadata_v3_14_0.xlsx")},
  "sheets info": [
      {
          'name': 'Metadata',
          'headers': ['Action', 'Sample Name', 'Sample Container Barcode', 'Sample Container Coordinates'],
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Metadata", "Sample Name", "name", "name"),
      ("Metadata", "Sample Container Barcode", "container__barcode", "container_barcode"),
      ("Metadata", "Sample Container Coordinates", "coordinate__name", "coordinates"),
  ],
}

SAMPLE_POOLING_TEMPLATE = {
  "identity": {"description": "Template to pool samples and libraries",
               "file": static("submission_templates/Sample_pooling_v4_2_0.xlsx"),
               "protocol": "Sample Pooling"},
  "sheets info": [
      {
          "name": "Pools",
          "headers": ["Pool Name", "Destination Container Barcode", "Destination Container Coord", "Destination Container Name",
                      "Destination Container Kind", "Destination Parent Container Barcode", "Destination Parent Container Coord",
                      "Seq Instrument Type", "Pooling Date (YYYY-MM-DD)", "Comment"],
          "stitch_column": "Pool Name",
          'batch': True,
      },
      {
          "name": "SamplesToPool",
          "headers": ["Pool Name", "Source Sample Name", "Source Container Barcode",  "Source Container Coord",
                      "Source Depleted", "Volume Used (uL)", "Volume In Pool (uL)", "Comment", "Workflow Action"],
          "stitch_column": "Pool Name",
          'batch': False,
      },
      {
          "name": "LabInput",
          "headers": ["Sample Name", "Technician Library Name", "Library Type",  "Index Name", "Sequencing Type", "Volume (uL)", "LibQC Name",
                      "Plate Barcode (Library)", "Well Coord", "Concentration (qPCR in nM)", "Library Size (bp)", "Pool Barcode", "Pool Name",
                      "Pool Proportion", "Loading Conc. (pM)", "PhiX", "Final Pool Volume (uL)", "Volume Library Used (uL)"],
          "stitch_column": "Pool Name",
      }
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("SamplesToPool", "Source Sample Name", "name", "name"),
      ("SamplesToPool", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("SamplesToPool", "Source Container Coord", "coordinate__name", "coordinates"),
      ("LabInput", "Sample Name", "name", "name"),
      ("LabInput", "Library Type", None, "library_type"),
      ("LabInput", "Index Name", None, "index_name"),
      ("LabInput", "Volume (uL)", "volume", "volume"),
      ("LabInput", "LibQC Name", "container__name", "container_name"),
      ("LabInput", "Plate Barcode (Library)", "container__barcode", "container_barcode"),
      ("LabInput", "Well Coord", "coordinate__name", "coordinates"),
      ("LabInput", "Concentration (qPCR in nM)", None, "concentration_as_nm"),
      ("LabInput", "Library Size (bp)", "fragment_size", "library_size"),],

}

SAMPLE_SUBMISSION_TEMPLATE = {
  "identity": {"description": "Template to add samples", "file": static("submission_templates/Sample_submission_v4_3_0.xlsx")},
  "sheets info": [
      {
          'name': 'SampleSubmission',
          'headers': ['Sample Type', 'Reception (YYYY-MM-DD)', 'Sample Kind', 'Sample Name', 'Alias', 'Pool Name',
                      'Volume (uL)', 'Conc. (ng/uL)', 'Collection Site', 'Tissue Source','Container Kind', 'Container Name',
                      'Container Barcode', 'Sample Coord', 'Location Barcode', 'Container Coord', 'Project', 'Study',
                      'Experimental Group','NCBI Taxon ID #','Individual ID', 'Individual Alias', 'Cohort', 'Sex', 'Pedigree',
                      'Mother ID', 'Father ID', 'Reference Genome', 'Library Type', 'Platform', 'Strandedness',
                      'Index Set', 'Index', 'Selection', 'Selection Target', 'Comment'],
          'stitch_column': 'Pool Name',
          'batch': False,
      },
      {
          "name": "PoolSubmission",
          "headers": ["Pool Name", "Reception (YYYY-MM-DD)", "Container Kind", "Container Name",
                      "Container Barcode", "Pool Coord", "Location Barcode", 
                      "Container Coord", "Seq Instrument Type", "Comment"],
          "stitch_column": "Pool Name",
          'batch': True,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [],
}

SAMPLE_UPDATE_TEMPLATE = {
  "identity": {"description": "Template to update samples", "file": static("submission_templates/Sample_update_v3_10_0.xlsx")},
  "sheets info": [
      {
          'name': 'SampleUpdate',
          'headers': ['Sample Name', 'Container Barcode', 'Coord (if plate)', 'New Volume (uL)', 'Delta Volume (uL)',
                      'New Conc. (ng/uL)', 'Depleted', 'Update Date', 'Update Comment'],
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("SampleUpdate", "Sample Name", "name", "name"),
      ("SampleUpdate", "Container Barcode", "container__barcode", "container_barcode"),
      ("SampleUpdate", "Coord (if plate)", "coordinate__name", "coordinates"),],
}

SAMPLE_QC_TEMPLATE = {
  "identity": {"description": "Template to perform sample quality control",
               "file": static("submission_templates/Sample_QC_v4_1_0.xlsx"),
               "protocol": "Sample Quality Control"},
  "sheets info": [
      {
          'name': 'SampleQC',
          'headers': ['Sample Name', 'Sample Container Barcode', 'Sample Container Coord', 'Initial Volume (uL)',
                      'Measured Volume (uL)', 'Volume Used (uL)', 'Concentration (ng/uL)', 'NA Quantity (ng)',
                      'RIN (for RNA only)', 'Quality Instrument', 'Quality Flag', 'Quantity Instrument',
                      'Quantity Flag', 'QC Date', 'Comment', 'Workflow Action'],
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("SampleQC", "Sample Name", "name", "name"),
      ("SampleQC", "Sample Container Barcode", "container__barcode", "container_barcode"),
      ("SampleQC", "Sample Container Coord", "coordinate__name", "coordinates"),
      ("SampleQC", "Initial Volume (uL)", "volume", "volume"),],
}

SAMPLE_EXTRACTION_TEMPLATE = {
  "identity": {"description": "Template to extract NA from samples",
               "file": static("submission_templates/Sample_extraction_v4_1_0.xlsx"),
               "protocol": "Extraction"},
  "sheets info": [
      {
          'name': 'ExtractionTemplate',
          'headers': ['Extraction Type', 'Volume Used (uL)', 'Source Sample Name', 'Source Container Barcode', 'Source Container Coord',
                      'Destination Container Barcode', 'Destination Container Coord', 'Destination Container Name',
                      'Destination Container Kind', 'Destination Parent Container Barcode', 'Destination Parent Container Coord',
                      'Volume (uL)', 'Conc. (ng/uL)', 'Source Depleted', 'Extraction Date', 'Comment', 'Workflow Action'],
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("ExtractionTemplate", "Source Sample Name", "name", "name"),
      ("ExtractionTemplate", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("ExtractionTemplate", "Source Container Coord", "coordinate__name", "coordinates"),],
}

SAMPLE_TRANSFER_TEMPLATE = {
  "identity": {"description": "Template to transfer samples",
               "file": static("submission_templates/Sample_transfer_v4_2_0.xlsx"),
               "protocol": "Transfer"},
  "sheets info": [
      {
          'name': 'SampleTransfer',
          'headers': ['Source Sample Name', 'Source Container Barcode', 'Source Container Coord', 'Destination Container Barcode',
                      'Destination Container Coord', 'Destination Container Name', 'Destination Container Kind',
                      'Destination Parent Container Barcode', 'Destination Parent Container Coord', 'Source Depleted',
                      'Volume Used (uL)', 'Transfer Date', 'Comment', 'Workflow Action'],
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("SampleTransfer", "Source Sample Name", "name", "name"),
      ("SampleTransfer", "Source Container Barcode", "container__barcode", "container_barcode"),
      ("SampleTransfer", "Source Container Coord", "coordinate__name", "coordinates"),],
}

SAMPLE_SELECTION_QPCR_TEMPLATE = {
  "identity": {"description": "Template to select samples using qPCR",
               "file": static("submission_templates/Sample_selection_qpcr_v3_10_0.xlsx"),
               "protocol": "Sample Selection using qPCR"},
  "sheets info": [
      {
          'name': 'Samples',
          'headers': ['qPCR Type', 'Volume Used (uL)', 'Sample Name', 'Sample Container Barcode', 'Sample Container Coord', 'Verification Container Barcode',
                      'Verification Container Coord', 'CT Value (Experimental) 1', 'CT Value (Experimental) 2', 'CT Value (Control)', 'Status', 'Source Depleted',
                      'qPCR Date', 'Comment'],
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("Samples", "Sample Name", "name", "name"),
      ("Samples", "Sample Container Barcode", "container__barcode", "container_barcode"),
      ("Samples", "Sample Container Coord", "coordinate__name", "coordinates"),],
}

PROJECT_STUDY_LINK_SAMPLES_TEMPLATE = {
  "identity": {"description": "Template to link samples to projects and studies", "file": static("submission_templates/Project_study_link_samples_v4_0_0.xlsx")},
  "sheets info": [
      {
          'name': 'ProjectLinkSamples',
          'headers': ['Action', 'Project Name', 'Study', 'Workflow Step Order', 'Sample Name', 'Sample Container Barcode', 'Sample Container Coord'],
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property"), ...]
  "prefill info": [
      ("ProjectLinkSamples", "Sample Name", "name", "name"),
      ("ProjectLinkSamples", "Sample Container Barcode", "container__barcode", "container_barcode"),
      ("ProjectLinkSamples", "Sample Container Coord", "coordinate__name", "coordinates"),],
}

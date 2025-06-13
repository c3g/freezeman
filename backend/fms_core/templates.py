"""
Contains constants pointing to the paths of templates for template actions for
various viewsets. Can be used to calculate URIs for the template files too.
"""

from django.templatetags.static import static

from fms_core.template_importer._constants import (VALID_ROBOT_CHOICES,
                                                   VALID_QC_FLAG_CHOICES,
                                                   LIBRARY_QC_QUALITY_INSTRUMENTS,
                                                   LIBRARY_QC_QUANTITY_INSTRUMENTS,
                                                   SAMPLE_QC_QUALITY_INSTRUMENTS,
                                                   SAMPLE_QC_QUANTITY_INSTRUMENTS)
from fms_core.models._constants import STRANDEDNESS_CHOICES
from fms_core.containers import SAMPLE_NON_RUN_CONTAINER_KINDS
from fms_core.prefilling_functions import get_axiom_experiment_barcode_from_comment, custom_prefill_8x12_container_biosample_names

__all__ = [
    "EXPERIMENT_AXIOM_TEMPLATE",
    "AXIOM_PREPARATION_TEMPLATE",
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
    "NORMALIZATION_PLANNING_TEMPLATE",
    "QUALITY_CONTROL_INTEGRATION_SPARK_TEMPLATE",
    "SAMPLE_METADATA_TEMPLATE",
    "SAMPLE_EXTRACTION_TEMPLATE",
    "SAMPLE_SUBMISSION_TEMPLATE",
    "SAMPLE_UPDATE_TEMPLATE",
    "SAMPLE_TRANSFER_TEMPLATE",
    "SAMPLE_QC_TEMPLATE",
    "SAMPLE_IDENTITY_QC_TEMPLATE",
    "SAMPLE_SELECTION_QPCR_TEMPLATE",
    "PROJECT_STUDY_LINK_SAMPLES_TEMPLATE",
    "MAX_HEADER_OFFSET"
]

MAX_HEADER_OFFSET = 20

AXIOM_PREPARATION_TEMPLATE = {
  "identity": {"description": "Template to prepare samples for Axiom genotyping",
               "file": static("submission_templates/Axiom_sample_preparation_v4_9_0.xlsx"),
               "protocol": "Axiom Sample Preparation"},
  "sheets info": [
      {
          'name': 'Axiom Batch',
          'headers': ['Container Barcode', 'Container Name', 'Preparation Start Date (YYYY-MM-DD)', 'Comment', 'Workflow Action',
                      'Axiom Module 1 Barcode', 'Incubation Time In Amplification (YYYY-MM-DD HH:MM)', 'Incubation Time Out Amplification (YYYY-MM-DD HH:MM)',
                      'Liquid Handler Instrument Amplification', 'Stored Before Fragmentation', 'Comment Amplification',
                      'Axiom Module 2.1 Barcode Fragmentation', 'Axiom Module 2.2 Barcode Fragmentation',
                      'Liquid Handler Instrument Fragmentation', 'Comment Fragmentation', 'Axiom Module 2.1 Barcode Precipitation',
                      'Axiom Module 2.2 Barcode Precipitation', 'Liquid Handler Instrument Precipitation', 'Comment Precipitation'],
          'batch': True,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
    ("Axiom Batch", "Container Barcode", "container__barcode", "container_barcode"),
    ("Axiom Batch", "Container Name", "container__name", "container_name"),
  ],
  "placement info": [],
}

CONTAINER_CREATION_TEMPLATE = {
  "identity": {"description": "Template to add containers", "file": static("submission_templates/Container_creation_v4_2_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerCreation',
          'headers': ['Container Kind', 'Container Name', 'Container Barcode', 'Parent Container Barcode',
                      'Parent Container Coordinates', 'Comment'],
          'batch': False,
      },],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [],
  "placement info": [],
}

CONTAINER_MOVE_TEMPLATE = {
  "identity": {"description": "Template to move containers", "file": static("submission_templates/Container_move_v3_6_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerMove',
          'headers': ['Container Barcode to move', 'Dest. Location Barcode', 'Dest. Location Coord', 'Update Comment'],
          'batch': False,
      },],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("ContainerMove", "Container Barcode to move", "barcode", None, None),],
  "placement info": [],
}

CONTAINER_RENAME_TEMPLATE = {
  "identity": {"description": "Template to rename containers", "file": static("submission_templates/Container_rename_v3_6_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerRename',
          'headers': ['Old Container Barcode', 'New Container Barcode', 'New Container Name', 'Update Comment'],
          'batch': False,
      },],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("ContainerRename", "Old Container Barcode", "barcode", None, None),],
  "placement info": [],
}

# Extracted sheet info for experiment run because it is shared between all templates of this category
EXPERIMENT_RUN_TEMPLATE_SHEET_INFO = [
      {
          'name': 'Experiments',
          'headers': ['Experiment Name', 'Experiment Container Barcode', 'Instrument Name',
                      'Experiment Container Kind', 'Experiment Start Date (YYYY-MM-DD)', 'Comment'],
          'stitch_column': 'Experiment Name',
          'batch': True,
      },
      {
          'name': 'Samples',
          'headers': ['Experiment Name', 'Source Sample Name', 'Source Container Barcode', 'Source Container Coordinates',
                      'Source Sample Current Volume (uL)', 'Source Sample Volume Used (uL)', 'Experiment Container Coordinates (Lane)', 'Comment', 'Workflow Action'],
          'stitch_column': 'Experiment Name',
          'batch': False,
      },]

EXPERIMENT_INFINIUM_TEMPLATE = {
  "identity": {"description": "Template to add Infinium experiments",
               "file": static("submission_templates/Experiment_run_Infinium_v5_0_0.xlsx"),
               "protocol": "Illumina Infinium Preparation"},
  "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Samples", "Source Sample Name", "name", "name", None),
      ("Samples", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("Samples", "Source Container Coordinates", "coordinate__name", "coordinates", None),
      ("Samples", "Source Sample Current Volume (uL)", "volume", "volume", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("Samples", "Experiment Container Coordinates (Lane)", "coordinates"),
      ("Experiments", "Experiment Container Barcode", "container_barcode"),
      ("Experiments", "Experiment Container Kind", "container_kind"),
  ],
}

EXPERIMENT_MGI_TEMPLATE = {
  "identity": {"description": "Template to add MGI experiments",
               "file": static("submission_templates/Experiment_run_MGI_v4_8_0.xlsx"),
               "protocol": "DNBSEQ Preparation"},
  "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Samples", "Source Sample Name", "name", "name", None),
      ("Samples", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("Samples", "Source Container Coordinates", "coordinate__name", "coordinates", None),
      ("Samples", "Source Sample Current Volume (uL)", "volume", "volume", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
    ("Samples", "Experiment Container Coordinates (Lane)", "coordinates"),
    ("Experiments", "Experiment Container Barcode", "container_barcode"),
    ("Experiments", "Experiment Container Kind", "container_kind"),
  ],
}

EXPERIMENT_ILLUMINA_TEMPLATE = {
  "identity": {"description": "Template to add Illumina experiments",
               "file": static("submission_templates/Experiment_run_illumina_v4_8_0.xlsx"),
               "protocol": "Illumina Preparation"},
  "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Samples", "Source Sample Name", "name", "name", None),
      ("Samples", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("Samples", "Source Container Coordinates", "coordinate__name", "coordinates", None),
      ("Samples", "Source Sample Current Volume (uL)", "volume", "volume", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("Samples", "Experiment Container Coordinates (Lane)", "coordinates"),
      ("Experiments", "Experiment Container Barcode", "container_barcode"),
      ("Experiments", "Experiment Container Kind", "container_kind"),
  ],
}

EXPERIMENT_AXIOM_TEMPLATE = {
    "identity" : {"description": "Template to add Axiom experiments",
                  "file": static("submission_templates/Experiment_run_Axiom_v4_8_0.xlsx"),
                  "protocol": "Axiom Experiment Preparation"},
    "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
    # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
    "prefill info": [
        ("Samples", "Source Sample Name", "name", "name", None),
        ("Samples", "Source Container Barcode", "container__barcode", "container_barcode", None),
        ("Samples", "Source Container Coordinates", "coordinate__name", "coordinates", None),
        ("Samples", "Source Sample Current Volume (uL)", "volume", "volume", None),
        ("Experiments", "Experiment Container Barcode", "container__comment", "container_comment", get_axiom_experiment_barcode_from_comment),
    ],
    # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
    "placement info": [
        ("Samples", "Experiment Container Coordinates (Lane)", "coordinates"),
        ("Experiments", "Experiment Container Barcode", "container_barcode"),
        ("Experiments", "Experiment Container Kind", "container_kind"),
    ],
}

INDEX_CREATION_TEMPLATE = {
  "identity": {"description": "Template to create indices", "file": static("submission_templates/Index_creation_v3_7_0.xlsx")},
  "sheets info": [
      {
          'name': 'Indices',
          'headers': ['Set Name', 'Index Name', 'Index Structure', 'Index 3 Prime', 'Index 5 Prime'],
          'batch': False,
      },],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [],
  "placement info": [],
}

LIBRARY_CAPTURE_TEMPLATE = {
  "identity": {"description": "Template to prepare captured libraries",
               "file": static("submission_templates/Library_capture_v4_4_0.xlsx"),
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
                      'Current Volume (uL)', 'Source Volume Used (uL)', 'Destination Volume (uL)', 'Comment', 'Workflow Action'],
          'stitch_column': 'Capture Batch ID',
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Library", "Library Name", "name", "name", None),
      ("Library", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("Library", "Source Container Coordinates", "coordinate__name", "coordinates", None),
      ("Library", "Current Volume (uL)", "volume", "volume", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("Library", "Destination Container Barcode", "container_barcode"),
      ("Library", "Destination Container Coordinates", "coordinates"),
      ("Library", "Destination Container Name", "container_name"),
      ("Library", "Destination Container Kind", "container_kind"),
  ],
}

LIBRARY_CONVERSION_TEMPLATE = {
  "identity": {"description": "Template to convert libraries",
               "file": static("submission_templates/Library_conversion_v4_4_0.xlsx"),
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
                      'Current Volume (uL)', 'Volume Used (uL)', 'Volume (uL)', 'Comment', 'Workflow Action'],
          'stitch_column': 'Library Batch ID',
          'batch': False,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Library", "Library Source Name", "name", "name", None),
      ("Library", "Library Source Container Barcode", "container__barcode", "container_barcode", None),
      ("Library", "Library Source Container Coordinates", "coordinate__name", "coordinates", None),
      ("Library", "Library Source Concentration (ng/uL)", "concentration", "concentration", None),
      ("Library", "Library Size (bp)", "fragment_size", "library_size", None),
      ("Library", "Current Volume (uL)", "volume", "volume", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("Library", "Destination Container Barcode", "container_barcode"),
      ("Library", "Destination Container Coordinates", "coordinates"),
      ("Library", "Destination Container Name", "container_name"),
      ("Library", "Destination Container Kind", "container_kind"),
  ],
}

LIBRARY_PREPARATION_TEMPLATE = {
  "identity": {"description": "Template to prepare libraries",
               "file": static("submission_templates/Library_preparation_v4_4_0.xlsx"),
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
                      'Library Parent Container Coordinates', 'Sample Current Volume (uL)', 'Sample Volume Used (uL)', 'Library Volume (uL)',
                      'Index Set', 'Index', 'Strandedness', 'Comment', 'Workflow Action'],
          'stitch_column': 'Library Batch ID',
          'batch': False,
      },
  ],
  "user prefill info": {
      "Strandedness": STRANDEDNESS_CHOICES
  },
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Library", "Sample Name", "name", "name", None),
      ("Library", "Sample Container Barcode", "container__barcode", "container_barcode", None),
      ("Library", "Sample Container Coordinates", "coordinate__name", "coordinates", None),
      ("Library", "Sample Current Volume (uL)", "volume", "volume", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("Library", "Library Container Barcode", "container_barcode"),
      ("Library", "Library Container Coordinates", "coordinates"),
      ("Library", "Library Container Name", "container_name"),
      ("Library", "Library Container Kind", "container_kind"),
  ],
}

LIBRARY_QC_TEMPLATE = {
  "identity": {"description": "Template to perform library quality control",
               "file": static("submission_templates/Library_QC_v4_8_0.xlsx"),
               "protocol": "Library Quality Control"},
  "sheets info": [
      {
        'name': 'LibraryQC',
        'headers': ['Library Name', 'Library Container Barcode', 'Library Container Coord', 'Current Volume (uL)',
                    'Measured Volume (uL)', 'Volume Used (uL)', 'Strandedness', 'Library size (bp)', 'Concentration (nM)',
                    'Concentration (ng/uL)', 'NA Quantity (ng)', 'Quality Instrument', 'Quality Flag',
                    'Quantity Instrument', 'Quantity Flag', 'QC Date (YYYY-MM-DD)', 'Comment', 'Workflow Action'],
        'batch': False,
      },
  ],
  "user prefill info": {
      "QC Date (YYYY-MM-DD)": "date",
      "Volume Used (uL)": "number",
      "Quality Instrument": LIBRARY_QC_QUALITY_INSTRUMENTS,
      "Quality Flag": VALID_QC_FLAG_CHOICES,
      "Quantity Instrument": LIBRARY_QC_QUANTITY_INSTRUMENTS,
      "Quantity Flag": VALID_QC_FLAG_CHOICES,
  },

  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
    ("LibraryQC", "Library Name", "name", "name", None),
    ("LibraryQC", "Library Container Barcode", "container__barcode", "container_barcode", None),
    ("LibraryQC", "Library Container Coord", "coordinate__name", "coordinates", None),
    ("LibraryQC", "Current Volume (uL)", "volume", "volume", None),
    ("LibraryQC", "Strandedness", "sample_strandedness", "strandedness", None),
    ],
  "placement info": [],
}

NORMALIZATION_TEMPLATE = {
  "identity": {"description": "Template to perform normalization",
               "file": static("submission_templates/Normalization_v4_5_0.xlsx"),
               "protocol": "Normalization"},
  "sheets info": [
      {
        'name': 'Normalization',
        'headers': ['Type', 'Sample Name', 'Source Container Barcode', 'Source Container Coord', 'Robot Source Container', 'Robot Source Coord',
                    'Destination Container Barcode', 'Destination Container Coord', 'Robot Destination Container', 'Robot Destination Coord',
                    'Destination Container Name', 'Destination Container Kind', 'Destination Parent Container Barcode',
                    'Destination Parent Container Coord', 'Source Depleted', 'Initial Conc. (ng/uL)', 'Current Volume (uL)', 'Volume Used (uL)',
                    'Input (ng)', 'Volume (uL)', 'Conc. (ng/uL)', 'Conc. (nM)', 'Normalization Date (YYYY-MM-DD)', 'Comment', 'Workflow Action'],
        'batch': False,
      },
  ],
  "user prefill info": {
        "Normalization Date (YYYY-MM-DD)": "date",
        "Conc. (ng/uL)": "number",
        "Conc. (nM)": "number",
  },
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Normalization", "Sample Name", "name", "name", None),
      ("Normalization", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("Normalization", "Source Container Coord", "coordinate__name", "coordinates", None),
      ("Normalization", "Initial Conc. (ng/uL)", "concentration", "concentration", None),
      ("Normalization", "Current Volume (uL)", "volume", "volume", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("Normalization", "Destination Container Barcode", "container_barcode"),
      ("Normalization", "Destination Container Coord", "coordinates"),
      ("Normalization", "Destination Container Name", "container_name"),
      ("Normalization", "Destination Container Kind", "container_kind"),
  ],
}

NORMALIZATION_PLANNING_TEMPLATE = {
  "identity": {"description": "Template to perform normalization planning",
               "file": static("submission_templates/Normalization_planning_v4_8_0.xlsx"),
               "protocol": "Normalization"},
  "sheets info": [
      {
        'name': 'Normalization',
        'headers': ['Type', 'Robot', 'Exclude From Robot', 'Sample Name', 'Source Container Barcode', 'Source Container Coord',
                    'Source Parent Container Barcode', 'Source Parent Container Coord',
                    'Destination Container Barcode', 'Destination Container Coord', 'Destination Container Name', 'Destination Container Kind',
                    'Destination Parent Container Barcode', 'Destination Parent Container Coord',
                    'Source Sample Current Volume (uL)', 'Source Sample Current Conc. (ng/uL)', 'Available Input (ng)',
                    'Norm. NA Quantity (ng)', 'Norm. Conc. (ng/uL)', 'Norm. Conc. (nM)', 'Manual Diluent Volume (uL)', 'Final Volume (uL)'],
        'batch': False,
      },
  ],
  "user prefill info": {
      "Robot": VALID_ROBOT_CHOICES,
      "Norm. NA Quantity (ng)": "number",
      "Norm. Conc. (ng/uL)": "number",
      "Norm. Conc. (nM)": "number",
      "Manual Diluent Volume (uL)": "number",
      "Final Volume (uL)": "number",
  },
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Normalization", "Sample Name", "name", "name", None),
      ("Normalization", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("Normalization", "Source Container Coord", "coordinate__name", "coordinates", None),
      ("Normalization", "Source Parent Container Barcode", "container__location__barcode", "container_location_barcode", None),
      ("Normalization", "Source Parent Container Coord", "container__coordinate__name", "container_location_coordinates", None),
      ("Normalization", "Source Sample Current Volume (uL)", "volume", "volume", None),
      ("Normalization", "Source Sample Current Conc. (ng/uL)", "concentration", "concentration", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("Normalization", "Destination Container Barcode", "container_barcode"),
      ("Normalization", "Destination Container Coord", "coordinates"),
      ("Normalization", "Destination Container Name", "container_name"),
      ("Normalization", "Destination Container Kind", "container_kind"),
  ],
}

QUALITY_CONTROL_INTEGRATION_SPARK_TEMPLATE = {
  "identity": {"description": "Template to perform quality control from a Spark instrument result file.",
               "protocol": "Quality Control - Integration"},
  "sheets info": [
      {
          'name': 'Default',
          'headers': ['Instrument', 'Well positions', '260nm', '280nm', '320nm', 'Concentration ug/ul', 'Purity 260/280', 'Mass/rxn (ug)'],
          'batch': False,
      },
  ]
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
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Metadata", "Sample Name", "name", "name", None),
      ("Metadata", "Sample Container Barcode", "container__barcode", "container_barcode", None),
      ("Metadata", "Sample Container Coordinates", "coordinate__name", "coordinates", None),
  ],
  "placement info": [],
}

SAMPLE_POOLING_TEMPLATE = {
  "identity": {"description": "Template to pool samples and libraries",
               "file": static("submission_templates/Sample_pooling_v4_12_0.xlsx"),
               "protocol": "Sample Pooling"},
  "sheets info": [
      {
          "name": "Pools",
          "headers": ["Pool Name", "Destination Container Barcode", "Destination Container Coord", "Robot Destination Coord",
                      "Destination Container Name", "Destination Container Kind", "Seq Instrument Type", "Pooling Date (YYYY-MM-DD)",
                      "Destination Parent Container Barcode", "Destination Parent Container Coord", "Comment"],
          "stitch_column": "Pool Name",
          'batch': True,
      },
      {
          "name": "SamplesToPool",
          "headers": ["Pool Name", "Type", "Source Sample Name", "Source Container Barcode",  "Source Container Coord",
                      "Index Name", "Robot Source Container", "Robot Source Coord", "Source Depleted", "Current Volume (uL)",
                      "Volume Used (uL)", "Volume In Pool (uL)", "Comment", "Workflow Action"],
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
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("SamplesToPool", "Source Sample Name", "name", "name", None),
      ("SamplesToPool", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("SamplesToPool", "Source Container Coord", "coordinate__name", "coordinates", None),
      ("SamplesToPool", "Index Name", None, "index_name", None),
      ("SamplesToPool", "Current Volume (uL)", "volume", "volume", None),
      ("LabInput", "Sample Name", "name", "name", None),
      ("LabInput", "Library Type", None, "library_type", None),
      ("LabInput", "Index Name", None, "index_name", None),
      ("LabInput", "Volume (uL)", "volume", "volume", None),
      ("LabInput", "LibQC Name", "container__name", "container_name", None),
      ("LabInput", "Plate Barcode (Library)", "container__barcode", "container_barcode", None),
      ("LabInput", "Well Coord", "coordinate__name", "coordinates", None),
      ("LabInput", "Concentration (qPCR in nM)", None, "concentration_as_nm", None),
      ("LabInput", "Library Size (bp)", "fragment_size", "library_size", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("Pools", "Destination Container Barcode", "container_barcode"),
      ("Pools", "Destination Container Coord", "coordinates"),
      ("Pools", "Destination Container Name", "container_name"),
      ("Pools", "Destination Container Kind", "container_kind"),
  ],
}

SAMPLE_POOLING_PLANNING_TEMPLATE = {
  "identity": {"description": "Template to perform pooling planning",
               "file": static("submission_templates/Sample_pooling_planning_v4_9_0.xlsx"),
               "protocol": "Sample Pooling"},
  "sheets info": [
      {
          "name": "SamplesToPool",
          "headers": ["Pool Name", "Type", "Source Sample Name", "Source Container Barcode",  "Source Container Coord",
                      "Current NA Quantity (ng)", "NA Quantity Used (ng)", "Source Depleted"],
          'batch': False,
      },
  ],
  "user prefill info": {
      "NA Quantity Used (ng)": "number",
  },
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("SamplesToPool", "Source Sample Name", "name", "name", None),
      ("SamplesToPool", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("SamplesToPool", "Source Container Coord", "coordinate__name", "coordinates", None),
      ("SamplesToPool", "Current NA Quantity (ng)", None, "quantity_in_ng", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [],
}

SAMPLE_SUBMISSION_TEMPLATE = {
  "identity": {"description": "Template to add samples", "file": static("submission_templates/Sample_submission_v4_14_0.xlsx")},
  "sheets info": [
      {
          'name': 'SampleSubmission',
          'headers': ['Sample Type', 'Reception (YYYY-MM-DD)', 'Sample Kind', 'Sample Name', 'Alias', 'Pool Name', 'Ratio Library In Pool',
                      'Volume (uL)', 'Conc. (ng/uL)', 'Collection Site', 'Tissue Source','Container Kind', 'Container Barcode',
                      'Container Name', 'Sample Coord', 'Location Kind', 'Location Barcode', 'Location Name', 'Container Coord', 'Project', 'Study',
                      'Experimental Group', 'Taxon', 'Sex', 'Reference Genome', 'Individual Name', 'Individual Alias', 'Cohort',
                      'Library Type', 'Platform', 'Strandedness', 'Index Set', 'Index', 'Selection', 'Selection Target', 'Comment'],
          'stitch_column': 'Pool Name',
          'batch': False,
      },
      {
          "name": "PoolSubmission",
          "headers": ["Pool Name", "Pool Volume", "Reception (YYYY-MM-DD)", "Container Kind", "Container Barcode",
                      "Container Name", "Pool Coord", "Location Kind", "Location Barcode", "Location Name",
                      "Container Coord", "Seq Instrument Type", "Comment"],
          "stitch_column": "Pool Name",
          'batch': True,
      },
  ],
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [],
  "placement info": [],
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
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("SampleUpdate", "Sample Name", "name", "name", None),
      ("SampleUpdate", "Container Barcode", "container__barcode", "container_barcode", None),
      ("SampleUpdate", "Coord (if plate)", "coordinate__name", "coordinates", None),
  ],
  "placement info": [],
}

SAMPLE_QC_TEMPLATE = {
  "identity": {"description": "Template to perform sample quality control",
               "file": static("submission_templates/Sample_QC_v4_12_0.xlsx"),
               "protocol": "Sample Quality Control"},
  "sheets info": [
      {
          'name': 'SampleQC',
          'headers': ['Sample Name', 'Sample Kind', 'Sample Container Barcode', 'Sample Container Coord', 'Sample Parent Container Barcode',
                      'Sample Parent Container Coord','Current Volume (uL)', 'Measured Volume (uL)', 'Volume Used (uL)',
                      'Concentration (ng/uL)', 'NA Quantity (ng)', 'RIN (for RNA only)', 'Quality Instrument', 'Quality Flag',
                      'Quantity Instrument', 'Quantity Flag', 'QC Date (YYYY-MM-DD)', 'Comment', 'Workflow Action'],
          'batch': False,
      },
  ],
  "user prefill info": {
      "QC Date (YYYY-MM-DD)": "date",
      "Volume Used (uL)": "number",
      "Quality Instrument": SAMPLE_QC_QUALITY_INSTRUMENTS,
      "Quality Flag": VALID_QC_FLAG_CHOICES,
      "Quantity Instrument": SAMPLE_QC_QUANTITY_INSTRUMENTS,
      "Quantity Flag": VALID_QC_FLAG_CHOICES,
  },
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("SampleQC", "Sample Name", "name", "name", None),
      ("SampleQC", "Sample Container Barcode", "container__barcode", "container_barcode", None),
      ("SampleQC", "Sample Container Coord", "coordinate__name", "coordinates", None),
      ("SampleQC", "Sample Parent Container Barcode", "container__location__barcode", "container_location_barcode", None),
      ("SampleQC", "Sample Parent Container Coord", "container__coordinate__name", "container_location_coordinates", None),
      ("SampleQC", "Current Volume (uL)", "volume", "volume", None),
  ],
  "placement info": [],
}

SAMPLE_EXTRACTION_TEMPLATE = {
  "identity": {"description": "Template to extract NA from samples",
               "file": static("submission_templates/Sample_extraction_v4_12_0.xlsx"),
               "protocol": "Extraction"},
  "sheets info": [
      {
          'name': 'ExtractionTemplate',
          'headers': ['Extraction Type', 'Current Volume (uL)', 'Volume Used (uL)', 'Source Sample Name', 'Source Container Barcode', 'Source Container Coord',
                      'Source Parent Container Barcode', 'Source Parent Container Coord', 'Destination Container Barcode', 'Destination Container Coord',
                      'Destination Container Name', 'Destination Container Kind', 'Destination Parent Container Barcode', 'Destination Parent Container Coord',
                      'Volume (uL)', 'Source Depleted', 'Extraction Date (YYYY-MM-DD)', 'Comment', 'Workflow Action'],
          'batch': False,
      },
  ],
  "user prefill info": {
      # "Extraction Type": ["DNA", "RNA"], # already prefilled by workflow
      "Volume Used (uL)": "number",
      # borrowed from extraction template
      "Destination Container Kind": list(SAMPLE_NON_RUN_CONTAINER_KINDS),
      "Volume (uL)": "number",
      "Source Depleted": ["YES"],
      "Extraction Date (YYYY-MM-DD)": "date",
      "Comment": "text",
  }
  ,
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("ExtractionTemplate", "Current Volume (uL)", "volume", "volume", None),
      ("ExtractionTemplate", "Source Sample Name", "name", "name", None),
      ("ExtractionTemplate", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("ExtractionTemplate", "Source Container Coord", "coordinate__name", "coordinates", None),
      ("ExtractionTemplate", "Source Parent Container Barcode", "container__location__barcode", "container_location_barcode", None),
      ("ExtractionTemplate", "Source Parent Container Coord", "container__coordinate__name", "container_location_coordinates", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("ExtractionTemplate", "Destination Container Barcode", "container_barcode"),
      ("ExtractionTemplate", "Destination Container Coord", "coordinates"),
      ("ExtractionTemplate", "Destination Container Name", "container_name"),
      ("ExtractionTemplate", "Destination Container Kind", "container_kind"),
  ],
}

SAMPLE_TRANSFER_TEMPLATE = {
  "identity": {"description": "Template to transfer samples",
               "file": static("submission_templates/Sample_transfer_v4_10_0.xlsx"),
               "protocol": "Transfer"},
  "sheets info": [
      {
          'name': 'SampleTransfer',
          'headers': ['Source Sample Name', 'Source Container Barcode', 'Source Container Coord', 'Destination Container Barcode',
                      'Destination Container Coord', 'Destination Container Name', 'Destination Container Kind',
                      'Destination Parent Container Barcode', 'Destination Parent Container Coord', 'Source Depleted',
                      'Current Volume (uL)', 'Volume Used (uL)', 'Transfer Date (YYYY-MM-DD)', 'Comment',
                      'Destination Project', 'Destination Study', 'Workflow Action'],
          'batch': False,
      },
  ],
  "user prefill info": {
      # borrowed from transfer template
      "Destination Container Kind": list(SAMPLE_NON_RUN_CONTAINER_KINDS),
      "Source Depleted": ["YES"],
      "Volume Used (uL)": "number",
      "Transfer Date (YYYY-MM-DD)": "date",
      "Comment": "text"
  },
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("SampleTransfer", "Source Sample Name", "name", "name", None),
      ("SampleTransfer", "Source Container Barcode", "container__barcode", "container_barcode", None),
      ("SampleTransfer", "Source Container Coord", "coordinate__name", "coordinates", None),
      ("SampleTransfer", "Current Volume (uL)", "volume", "volume", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("SampleTransfer", "Destination Container Barcode", "container_barcode"),
      ("SampleTransfer", "Destination Container Coord", "coordinates"),
      ("SampleTransfer", "Destination Container Name", "container_name"),
      ("SampleTransfer", "Destination Container Kind", "container_kind"),
  ],
}

SAMPLE_IDENTITY_QC_TEMPLATE = {
  "identity": {"description": "Template to ascertain sample identity",
               "file": static("submission_templates/Sample_identity_QC_v5_2_0.xlsx"),
               "protocol": "Sample Identity Quality Control"},
  "sheets info": [
      {
          'name': 'SampleIdentityQC',
          'headers': ['Sample Name', 'Sample Container Barcode', 'Sample Container Coord', 'QC Container Coord', 'Volume Used (uL)', 'QC Date (YYYY-MM-DD)', 'Comment', 'Workflow Action'],
          'batch': False,
      },
      {
          "name": "QcContainer",
          "headers": ["Coord", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
          "custom_prefilling": custom_prefill_8x12_container_biosample_names,
      },
  ],
  "user prefill info": {
      "Volume Used (uL)": "number",
      "QC Date (YYYY-MM-DD)": "date",
      "Comment": "text"
  },
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("SampleIdentityQC", "Sample Name", "name", "name", None),
      ("SampleIdentityQC", "Sample Container Barcode", "container__barcode", "container_barcode", None),
      ("SampleIdentityQC", "Sample Container Coord", "coordinate__name", "coordinates", None),
  ],
  # placement_info : [("Template Sheet Name", "Template Column Header", "Placement Data Key"]
  "placement info": [
      ("SampleIdentityQC", "QC Container Coord", "coordinates"),
  ],
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
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("Samples", "Sample Name", "name", "name", None),
      ("Samples", "Sample Container Barcode", "container__barcode", "container_barcode", None),
      ("Samples", "Sample Container Coord", "coordinate__name", "coordinates", None),
  ],
  "placement info": [],
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
  # prefill_info : [("Template Sheet Name", "Template Column Header", "Queryset Name", "Sample Model Attribute/Property", "Extractor Function"), ...]
  "prefill info": [
      ("ProjectLinkSamples", "Sample Name", "name", "name", None),
      ("ProjectLinkSamples", "Sample Container Barcode", "container__barcode", "container_barcode", None),
      ("ProjectLinkSamples", "Sample Container Coord", "coordinate__name", "coordinates", None),
  ],
  "placement info": [],
}
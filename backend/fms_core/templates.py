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
    "INDEX_CREATION_TEMPLATE",
    "LIBRARY_PREPARATION_TEMPLATE",
    "SAMPLE_EXTRACTION_TEMPLATE",
    "SAMPLE_SUBMISSION_TEMPLATE",
    "SAMPLE_UPDATE_TEMPLATE",
    "SAMPLE_TRANSFER_TEMPLATE",
    "SAMPLE_QC_TEMPLATE",
    "SAMPLE_SELECTION_QPCR_TEMPLATE",
    "PROJECT_LINK_SAMPLES_TEMPLATE",
    "MAX_HEADER_OFFSET"
]

MAX_HEADER_OFFSET = 20

CONTAINER_CREATION_TEMPLATE = {
  "identity": {"description": "Template to add containers", "file": static("submission_templates/Container_creation_v3_5_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerCreation',
          'headers': ['Container Kind', 'Container Name', 'Container Barcode', 'Parent Container Barcode',
                      'Parent Container Coordinates'],
      },],
  "prefill info": [],
}

CONTAINER_MOVE_TEMPLATE = {
  "identity": {"description": "Template to move containers", "file": static("submission_templates/Container_move_v3_6_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerMove',
          'headers': ['Container Barcode to move', 'Dest. Location Barcode', 'Dest. Location Coord', 'Update Comment'],
      },],
  "prefill info": [
      ("ContainerMove", "Container Barcode to move", "barcode"),],
}

CONTAINER_RENAME_TEMPLATE = {
  "identity": {"description": "Template to rename containers", "file": static("submission_templates/Container_rename_v3_6_0.xlsx")},
  "sheets info": [
      {
          'name': 'ContainerRename',
          'headers': ['Old Container Barcode', 'New Container Barcode', 'New Container Name', 'Update Comment'],
      },],
  "prefill info": [
      ("ContainerRename", "Old Container Barcode", "barcode"),],
}

# Extracted sheet info for experiment run because it is shared between all templates of this category
EXPERIMENT_RUN_TEMPLATE_SHEET_INFO = [
      {
          'name': 'Experiments',
          'headers': ['Experiment Name', 'Experiment Container Barcode', 'Experiment Container Kind',
                      'Instrument Name', 'Experiment Start Date', 'Comment'],
      },
      {
          'name': 'Samples',
          'headers': ['Experiment Name', 'Source Container Barcode', 'Source Container Coordinates', 'Source Sample Volume Used',
                      'Experiment Container Coordinates', 'Comment'],
      },]

EXPERIMENT_INFINIUM_TEMPLATE = {
  "identity": {"description": "Template to add Infinium experiments", "file": static("submission_templates/Experiment_Infinium_24_v3_6_0.xlsx")},
  "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
  "prefill info": [
      ("Samples", "Source Container Barcode", "container__barcode"),
      ("Samples", "Source Container Coordinates", "coordinates"),],
}

EXPERIMENT_MGI_TEMPLATE = {
  "identity": {"description": "Template to add MGI experiments", "file": static("submission_templates/Experiment_run_MGI_v3_6_0.xlsx")},
  "sheets info": EXPERIMENT_RUN_TEMPLATE_SHEET_INFO,
  "prefill info": [
      ("Samples", "Source Container Barcode", "container__barcode"),
      ("Samples", "Source Container Coordinates", "coordinates"),],
}

INDEX_CREATION_TEMPLATE = {
  "identity": {"description": "Template to create indices", "file": static("submission_templates/Index_creation_v3_7_0.xlsx")},
  "sheets info": [
      {
          'name': 'Indices',
          'headers': ['Set Name', 'Index Name', 'Index Structure', 'Index 3 Prime', 'Index 5 Prime'],
      },],
  "prefill info": [],
}

LIBRARY_PREPARATION_TEMPLATE = {
  "identity": {"description": "Template to prepare libraries", "file": static("submission_templates/Library_preparation_v3_8_0.xlsx")},
  "sheets info": [
      {
          'name': 'Library Batch',
          'headers': ['Library Batch ID', 'Library Type', 'Library Date (YYYY-MM-DD)', 'Platform', 'Comment',
                      'Library Technician Name', 'Shearing Technician Name', 'Shearing Method', 'Shearing Size (bp)',
                      'Library Kit Used', 'Library Kit Lot', 'Thermocycler Used', 'PCR Cycles', 'PCR Enzyme Used',
                      'PCR Enzyme Lot', 'EZ-96 DNA Methylation-Gold MagPrep Lot'],
      },
      {
          'name': 'Library',
          'headers': ['Library Batch ID', 'Sample Container Barcode', 'Sample Container Coordinates', 'Library Container Barcode',
                      'Library Container Coordinates',  'Library Container Name', 'Library Container Kind', 'Library Parent Container Barcode',
                      'Library Parent Container Coordinates', 'Sample Volume Used (uL)', 'Library Volume (uL)',
                      'Index Set', 'Index', 'Strandedness', 'Comment'],
      },
  ],
  "prefill info": [
      ("Library", "Sample Container Barcode", "container__barcode"),
      ("Library", "Sample Container Coordinates", "coordinates"),],
}

SAMPLE_SUBMISSION_TEMPLATE = {
  "identity": {"description": "Template to add samples", "file": static("submission_templates/Sample_submission_v3_8_0.xlsx")},
  "sheets info": [
      {
          'name': 'SampleSubmission',
          'headers': ['Sample Kind', 'Sample Name', 'Alias', 'Project', 'Cohort', 'Experimental Group', 'NCBI Taxon ID #', 'Sample Coord',
                      'Container Kind', 'Container Name', 'Container Barcode', 'Location Barcode', 'Container Coord',
                      'Individual ID', 'Sex', 'Pedigree', 'Mother ID', 'Father ID', 'Volume (uL)', 'Conc. (ng/uL)',
                      'Collection Site', 'Tissue Source', 'Library Type', 'Platform', 'Strandedness', 'Index Set', 'Index', 'Reception Date', 'Comment']
      },],
  "prefill info": [],
}

SAMPLE_UPDATE_TEMPLATE = {
  "identity": {"description": "Template to update samples", "file": static("submission_templates/Sample_update_v3_5_0.xlsx")},
  "sheets info": [
      {
          'name': 'SampleUpdate',
          'headers': ['Container Barcode', 'Coord (if plate)', 'New Volume (uL)', 'Delta Volume (uL)',
                      'New Conc. (ng/uL)', 'Depleted', 'Update Date', 'Update Comment']
      },],
  "prefill info": [
      ("SampleUpdate", "Container Barcode", "container__barcode"),
      ("SampleUpdate", "Coord (if plate)", "coordinates"),],
}

SAMPLE_QC_TEMPLATE = {
  "identity": {"description": "Template to perform sample quality control", "file": static("submission_templates/Sample_QC_v3_7_0.xlsx")},
  "sheets info": [
      {
          'name': 'SampleQC',
          'headers': ['Sample Container Barcode', 'Sample Container Coord', 'Initial Volume (uL)',
                      'Measured Volume (uL)', 'Volume Used (uL)', 'Concentration (ng/uL)', 'NA Quantity (ng)',
                      'RIN (for RNA only)', 'Quality Instrument', 'Quality Flag', 'Quantity Instrument',
                      'Quantity Flag', 'QC Date', 'Comment']
      },],
  "prefill info": [
      ("SampleQC", "Sample Container Barcode", "container__barcode"),
      ("SampleQC", "Sample Container Coord", "coordinates"),
      ("SampleQC", "Initial Volume (uL)", "volume"),],
}

SAMPLE_EXTRACTION_TEMPLATE = {
  "identity": {"description": "Template to extract NA from samples", "file": static("submission_templates/Sample_extraction_v3_5_0.xlsx")},
  "sheets info": [
      {
          'name': 'ExtractionTemplate',
          'headers': ['Extraction Type', 'Volume Used (uL)', 'Source Container Barcode', 'Source Container Coord',
                      'Destination Container Barcode', 'Destination Container Coord', 'Destination Container Name',
                      'Destination Container Kind', 'Destination Parent Container Barcode', 'Destination Parent Container Coord',
                      'Volume (uL)', 'Conc. (ng/uL)', 'Source Depleted', 'Extraction Date', 'Comment'],
      },],
  "prefill info": [
      ("ExtractionTemplate", "Source Container Barcode", "container__barcode"),
      ("ExtractionTemplate", "Source Container Coord", "coordinates"),],
}

SAMPLE_TRANSFER_TEMPLATE = {
  "identity": {"description": "Template to transfer samples", "file": static("submission_templates/Sample_transfer_v3_5_0.xlsx")},
  "sheets info": [
      {
          'name': 'SampleTransfer',
          'headers': ['Source Container Barcode', 'Source Container Coord', 'Destination Container Barcode', 
                      'Destination Container Coord', 'Destination Container Name', 'Destination Container Kind',
                      'Destination Parent Container Barcode', 'Destination Parent Container Coord', 'Source Depleted',
                      'Volume Used (uL)', 'Transfer Date', 'Comment'],
      },],
  "prefill info": [
      ("SampleTransfer", "Source Container Barcode", "container__barcode"),
      ("SampleTransfer", "Source Container Coord", "coordinates"),],
}

SAMPLE_SELECTION_QPCR_TEMPLATE = {
  "identity": {"description": "Template to select samples using qPCR", "file": static("submission_templates/Sample_selection_qpcr_v3_6_0.xlsx")},
  "sheets info": [
      {
          'name': 'Samples',
          'headers': ['qPCR Type', 'Volume Used (uL)', 'Sample Container Barcode', 'Sample Container Coord', 'Verification Container Barcode',
                      'Verification Container Coord', 'CT Value (Experimental) 1', 'CT Value (Experimental) 2', 'CT Value (Control)', 'Status', 'Source Depleted',
                      'qPCR Date', 'Comment'],
      },],
  "prefill info": [
      ("Samples", "Sample Container Barcode", "container__barcode"),
      ("Samples", "Sample Container Coord", "coordinates"),],
}

PROJECT_LINK_SAMPLES_TEMPLATE = {
  "identity": {"description": "Template to link samples to projects", "file": static("submission_templates/Project_link_samples_v3_5_0.xlsx")},
  "sheets info": [
      {
          'name': 'ProjectLinkSamples',
          'headers': ['Action', 'Project Name', 'Sample Name', 'Sample Container Barcode', 'Sample Container Coord'],
      },],
  "prefill info": [
      ("ProjectLinkSamples", "Sample Container Barcode", "container__barcode"),
      ("ProjectLinkSamples", "Sample Container Coord", "coordinates"),
      ("ProjectLinkSamples", "Sample Name", "name"),],
}

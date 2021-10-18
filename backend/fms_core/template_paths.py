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
    "SAMPLE_EXTRACTION_TEMPLATE",
    "SAMPLE_SUBMISSION_TEMPLATE",
    "SAMPLE_UPDATE_TEMPLATE",
    "SAMPLE_TRANSFER_TEMPLATE",
    "PROJECT_LINK_SAMPLES_TEMPLATE",
]

CONTAINER_CREATION_TEMPLATE = static("submission_templates/Container_creation_vtest.xlsx")
CONTAINER_MOVE_TEMPLATE = static("submission_templates/Container_move_v3_2_0.xlsx")
CONTAINER_RENAME_TEMPLATE = static("submission_templates/Container_rename_v3_2_0.xlsx")
EXPERIMENT_INFINIUM_TEMPLATE = static("submission_templates/Experiment_Infinium_24_vtest.xlsx")
SAMPLE_EXTRACTION_TEMPLATE = static("submission_templates/Sample_extraction_vtest.xlsx")
SAMPLE_SUBMISSION_TEMPLATE = static("submission_templates/Sample_submission_vtest.xlsx")
SAMPLE_UPDATE_TEMPLATE = static("submission_templates/Sample_update_v3_2_0.xlsx")
SAMPLE_TRANSFER_TEMPLATE = static("submission_templates/Sample_transfer_vtest.xlsx")
PROJECT_LINK_SAMPLES_TEMPLATE = static("submission_templates/Project_link_samples_v3_4_0.xlsx")


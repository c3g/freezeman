"""
Contains constants pointing to the paths of templates for template actions for
various viewsets. Can be used to calculate URIs for the template files too.
"""

from django.templatetags.static import static

__all__ = [
    "CONTAINER_CREATION_TEMPLATE",
    "CONTAINER_MOVE_TEMPLATE",
    "CONTAINER_RENAME_TEMPLATE",
    "SAMPLE_EXTRACTION_TEMPLATE",
    "SAMPLE_SUBMISSION_TEMPLATE",
    "SAMPLE_UPDATE_TEMPLATE",
]

CONTAINER_CREATION_TEMPLATE = static("submission_templates/Container_creation_v0.4.xlsx")
CONTAINER_MOVE_TEMPLATE = static("submission_templates/Container_move_v0.4.xlsx")
CONTAINER_RENAME_TEMPLATE = static("submission_templates/Container_rename_v0.1.xlsx")
SAMPLE_EXTRACTION_TEMPLATE = static("submission_templates/Extraction_v0.10.xlsx")
SAMPLE_SUBMISSION_TEMPLATE = static("submission_templates/Sample_submission_v0.13.xlsx")
SAMPLE_UPDATE_TEMPLATE = static("submission_templates/Sample_update_v0.5.xlsx")

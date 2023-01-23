from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.project_study_link_samples import ProjectStudyLinkSamplesHandler
from fms_core.templates import PROJECT_STUDY_LINK_SAMPLES_TEMPLATE

from fms_core.utils import str_cast_and_normalize
from fms_core.template_importer._utils import input_to_integer_and_none

class ProjectStudyLinkSamples(GenericImporter):
    SHEETS_INFO = PROJECT_STUDY_LINK_SAMPLES_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        project_link_samples_sheet = self.sheets['ProjectLinkSamples']

        for row_id, row_data in enumerate(project_link_samples_sheet.rows):
            project = {
                'name': str_cast_and_normalize(row_data['Project Name']),
                'study_letter': str_cast_and_normalize(row_data['Study']),
                'step_order': input_to_integer_and_none(row_data['Workflow Step Order']),
            }
            sample = {
                'sample_name': str_cast_and_normalize(row_data['Sample Name']),
                'sample_container_barcode': str_cast_and_normalize(row_data['Sample Container Barcode']),
                'sample_container_coord': str_cast_and_normalize(row_data['Sample Container Coord'])
            }
            action = {
                'name': str_cast_and_normalize(row_data['Action']).upper() if row_data['Action'] else None
            }

            project_study_link_samples_kwargs = dict(
                sample=sample,
                project=project,
                action=action,
            )

            (result, _) = self.handle_row(
                row_handler_class=ProjectStudyLinkSamplesHandler,
                sheet=project_link_samples_sheet,
                row_i=row_id,
                **project_study_link_samples_kwargs,
            )

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.project_link_samples import ProjectLinkSamplesHandler

class ProjectLinkSamples(GenericImporter):
    SHEETS_INFO = [
        {
            'name': 'ProjectLinkSamples',
            'headers': ['Action', 'Project Name', 'Sample Name', 'Sample Container Barcode', 'Sample Container Coord'],
        },
    ]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        project_link_samples_sheet = self.sheets['ProjectLinkSamples']

        for row_id, row_data in enumerate(project_link_samples_sheet.rows):
            project = {
                'name': row_data['Project Name'],
            }
            sample = {
                'sample_name': row_data['Sample Name'],
                'sample_container_barcode': row_data['Sample Container Barcode'],
                'sample_container_coord': row_data['Sample Container Coord']
            }
            action = {
                'name': row_data['Action'].upper() if row_data['Action'] else None
            }

            project_link_samples_kwargs = dict(
                sample=sample,
                project=project,
                action=action,
            )

            (result, _) = self.handle_row(
                row_handler_class=ProjectLinkSamplesHandler,
                sheet=project_link_samples_sheet,
                row_i=row_id,
                **project_link_samples_kwargs,
            )

from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container
from fms_core.services.project import get_project
from fms_core.services.project_link_samples import create_link, remove_link
from fms_core.services.study import get_study
from fms_core.services.sample_next_step import queue_sample_to_study_workflow

from fms_core.utils import blank_str_to_none

ADD_ACTION = "ADD"
REMOVE_ACTION = "REMOVE"

class ProjectLinkSamplesHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, sample, project, action):
        # Get sample object
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(barcode=sample['sample_container_barcode'],
                                                                                               coordinates=sample['sample_container_coord'])
        # Get project object
        project_obj, self.errors['project'], self.warnings['project'] = get_project(project['name'])

        if sample_obj and project_obj:
            if sample_obj.name != sample['sample_name']:
                warning_msg = f"Sample in container with barcode {sample['sample_container_barcode']} " + \
                              (f"at coordinate {sample['sample_container_coord']} " if sample['sample_container_coord'] else f"") + \
                              f"is named {sample_obj.name} not {sample['sample_name']}."
                self.warnings['sample'].append(warning_msg)

            # Check if link exists to ensure there's not a duplicated association
            if action['name'] == ADD_ACTION:
                # Create link object if no errors
                link_created, self.errors['link'], self.warnings['link'] = create_link(sample=sample_obj,
                                                                                       project=project_obj)

                # Queue sample to study if specified
                if project['study_letter']:
                    study_obj, self.errors['study'], self.warnings['study'] = get_study(project_obj, project['study_letter'])

                    if study_obj:
                        study_start = project['study_start']
                        _, self.errors['queue_to_study'], self.warnings['queue_to_study'] = queue_sample_to_study_workflow(sample_obj, study_obj, order=study_start)
                    else:
                        self.errors['study'] = f"Specified study {project['study_letter']} doesn't exist for project {project['name']}"

            # If the link doesn't exists we can't perform a remove action
            elif action['name'] == REMOVE_ACTION:
                # Remove link object if no errors
                link_removed, self.errors['link'], self.warnings['link'] = remove_link(sample=sample_obj,
                                                                                       project=project_obj)
                
                # Dequeue??? 

            # Action not provided or invalid
            else:
                self.errors['action'] = 'Either an Add or Remove action is required.'

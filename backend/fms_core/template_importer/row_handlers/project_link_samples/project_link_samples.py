from datetime import datetime

from fms_core.models import SampleByProject

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container
from fms_core.services.project import get_project
from fms_core.services.project_link_samples import create_link, remove_link

ADD_ACTION = "ADD"
REMOVE_ACTION = "REMOVE"

class ProjectLinkSamplesHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, sample, project, action):
        print('start project link samples row handler')

        # Get sample object
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(barcode=sample["sample_container_barcode"],
                                                                                               coordinates=sample["sample_container_coord"])
        # Get project object
        project_obj, self.errors['project'], self.warnings['project'] = get_project(project['name'])

        # Check if link exists to ensure there's not a duplicated association
        if action['name'] == ADD_ACTION:
            # Create link object if no errors
            project_sample_link, self.errors['link'], self.warnings['link'] = create_link(sample=sample_obj,
                                                                                          project=project_obj)

        # If the link doesn't exists we can't perform a remove action
        elif action['name'] == REMOVE_ACTION:
            # Remove link object if no errors
            num_deleted, self.errors['link'], self.warnings['link'] = remove_link(sample=sample_obj,
                                                                                  project=project_obj)

        print('SAMPLE OBJ', sample_obj)
        print('PROJECT OBJ', project_obj)

        print('project link samples/ row handler ERRORS: ', self.errors)
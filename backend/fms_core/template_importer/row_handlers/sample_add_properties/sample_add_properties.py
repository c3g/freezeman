from datetime import datetime

from fms_core.models import SampleByProject

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container, add_sample_properties, update_sample_properties, remove_sample_properties

ADD_ACTION = "ADD"
UPDATE_ACTION = "UPDATE"
REMOVE_ACTION = "REMOVE"

class SampleAddPropertiesHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, action, sample_info, properties):
        # Get sample object
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(barcode=sample_info['container_barcode'],
                                                                                               coordinates=sample_info['container_coordinates'])


        if sample_obj:
            if sample_obj.name != sample_info['name']:
                warning_msg = f"Sample in container with barcode {sample_info['container_barcode']} " + \
                              (f"at coordinate {sample_info['container_coordinates']} " if sample_info['container_coordinates'] else f"") + \
                              f"is named {sample_obj.name} not {sample_info['sample_name']}."
                self.warnings['sample'].append(warning_msg)

            # Check if sample does not have property ensure there's not a duplicated association
            if action == ADD_ACTION:
                # Create link object if no errors
                properties, self.errors['properties'], self.warnings['properties'] = add_sample_properties(sample=sample_obj,
                                                                                                           properties=properties)

            # Check if sample already has a property associated with it
            if action == UPDATE_ACTION:
                # Create link object if no errors
                properties, self.errors['properties'], self.warnings['properties'] = update_sample_properties(sample=sample_obj,
                                                                                                              properties=properties)


            # Check that property exists and it is associated to the sample
            elif action == REMOVE_ACTION:
                # Remove link object if no errors
                num_objects_deleted, self.errors['properties'], self.warnings['properties'] = remove_sample_properties(sample=sample_obj,
                                                                                                                       properties=properties)

            # Action not provided or invalid
            else:
                self.errors['action'] = 'Action is required.'

from datetime import datetime

from fms_core.models import SampleByProject

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container, add_sample_metadata, update_sample_metadata, remove_sample_metadata

ADD_ACTION = "ADD"
UPDATE_ACTION = "UPDATE"
REMOVE_ACTION = "REMOVE"

class SampleAddMetadataHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, action, sample_info, metadata):
        # Add generic format warning for metadata name
        self.warnings['metadata_name'] = "Metadata names are stored in a lower case and underscore format. (example_metadata)"

        # Get sample object
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(barcode=sample_info['container_barcode'],
                                                                                               coordinates=sample_info['container_coordinates'])


        if sample_obj:
            if sample_obj.name != sample_info['name']:
                error_msg = f"Sample in container with barcode {sample_info['container_barcode']} " + \
                            (f"at coordinate {sample_info['container_coordinates']} " if sample_info['container_coordinates'] else f"") + \
                            f"is named {sample_obj.name} not {sample_info['sample_name']}."
                self.errors['sample'].append(error_msg)

            # Check if sample does not have the metadata and ensure there's not a duplicated association
            if action == ADD_ACTION:
                # Create link object if no errors
                metadata, self.errors['metadata'], self.warnings['metadata'] = add_sample_metadata(sample=sample_obj,
                                                                                                   metadata=metadata)

            # Check if sample already has the metadata associated with it
            elif action == UPDATE_ACTION:
                # Create link object if no errors
                metadata, self.errors['metadata'], self.warnings['metadata'] = update_sample_metadata(sample=sample_obj,
                                                                                                      metadata=metadata)

            # Check that the metadata exists and it is associated to the sample
            elif action == REMOVE_ACTION:
                # Remove link object if no errors
                _, self.errors['metadata'], self.warnings['metadata'] = remove_sample_metadata(sample=sample_obj,
                                                                                               metadata=metadata)

            # Action not provided or invalid
            else:
                self.errors['action'] = 'Action is required.'

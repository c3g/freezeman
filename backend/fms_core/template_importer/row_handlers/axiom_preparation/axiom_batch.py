from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.services.container import get_container

class AxiomBatchRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, container, start_date, comment, workflow,
                          process_properties, protocols_dict, imported_template=None):

        # Get the container
        container_obj, self.errors["container"], self.warnings["container"] = get_container(barcode=container["barcode"])
        if container_obj is not None:
            # Validate the container barcode matches the container name
            if container["name"] is not None and container_obj.name != container["name"]:
                self.errors["container"].append(f"Name ({0}) of the container obtained from barcode does not match the container name submitted for validation ({1}).", [container_obj.name, container["name"]])


            # create_process

            # create_process_properties

            # sample loop
            # create_process_measurement

            # execute_workflow_action


from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.services.container import get_container
from fms_core.services.process import create_process
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.property_value import create_process_properties
from fms_core.services.sample_next_step import execute_workflow_action

from datetime import datetime

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

            main_protocol = next(iter(protocols_dict))
            # create_process
            processes_by_protocol_id, self.errors["process"], self.warnings["process"] = create_process(protocol=main_protocol,
                                                                                                        creation_comment=comment if comment else f"Automatically generated via Axiom Sample Preparation on {datetime.utcnow().isoformat()}Z",
                                                                                                        create_children=True, 
                                                                                                        children_protocols=protocols_dict[main_protocol],
                                                                                                        imported_template=imported_template)

            # create_process_properties
            if not self.errors["process"]:
                properties, self.errors["properties"], self.warnings["properties"] = create_process_properties(process_properties, processes_by_protocol_id)

            main_process = processes_by_protocol_id[main_protocol.id]
            # sample loop
            for sample in container_obj.samples.all():  
                # create_process_measurement
                process_measurement, self.errors["process_measurement"], self.warnings["process_measurement"] = create_process_measurement(process=main_process,
                                                                                                                                           source_sample=sample,
                                                                                                                                           execution_date=start_date)
                if process_measurement and workflow is not None:
                    # Process the workflow action
                    self.errors["workflow"], self.warnings["workflow"] = execute_workflow_action(workflow_action=workflow["step_action"],
                                                                                                 step=workflow["step"],
                                                                                                 current_sample=sample,
                                                                                                 process_measurement=process_measurement)
               


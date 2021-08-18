from datetime import datetime

from fms_core.import_tool.row_handlers._generic import GenericRowHandler

from fms_core.services.process import create_processes_for_experiment_from_protocols_dict
from fms_core.services.property_value import create_properties_from_values_and_types
from fms_core.services.experiment_run import (create_experiment_run, associate_samples_to_experiment_run)


class ExperimentRunRowHandler(GenericRowHandler):
    def __init__(self, row_identifier):
        super().__init__(row_identifier)


    def process_row(self, experiment_type_obj, instrument, container, start_date,
                    sample_rows_info, properties, protocols_dict, properties_by_name_dict):

        if len(sample_rows_info) < 1:
            self.errors['samples'] = f"No samples are associated to this experiment"

        # Calling the service creator for ExperimentRun
        if self.errors == {}:
            top_process_obj, experiment_processes_by_protocol_id, self.errors[
                'process'] = create_processes_for_experiment_from_protocols_dict(protocols_objs_dict=protocols_dict,
                                                                                 creation_comment=f"Automatically generated via experiment run creation on {datetime.utcnow().isoformat()}Z")

            experiment_run, self.errors['experiment_run'] = create_experiment_run(experiment_type_obj,
                                                                top_process_obj,
                                                                instrument,
                                                                container,
                                                                start_date,
                                                                )

            if experiment_run:
                _, self.errors['properties'] = create_properties_from_values_and_types(properties, properties_by_name_dict,
                                                                                  experiment_processes_by_protocol_id)
                print('experiment_run row-handler - properties/errors', self.errors['properties'])
                samples, self.errors['samples'] = associate_samples_to_experiment_run(experiment_run, sample_rows_info)
                print('experiment_run row-handler- samples/errors', self.errors['samples'])

        return super().get_result()
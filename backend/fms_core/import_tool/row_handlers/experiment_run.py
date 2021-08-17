from ._generic import GenericRowHandler
from ...services import (
    create_experiment_run_complete,
)


class ExperimentRunRowHandler(GenericRowHandler):
    def __init__(self, row_identifier):
        super().__init__(row_identifier)


    def process_row(self, experiment_type_obj, instrument, container, start_date,
                    sample_rows, properties, protocols_dict, properties_by_name_dict):

        # Calling the service creator for ExperimentRun
        if self.errors == {}:
            experiment_run, self.errors = create_experiment_run_complete(experiment_type_obj,
                                                                         instrument,
                                                                         container,
                                                                         start_date,
                                                                         sample_rows,
                                                                         properties,
                                                                         protocols_dict,
                                                                         properties_by_name_dict)

        return super().get_result()
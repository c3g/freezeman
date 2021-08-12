from datetime import datetime

from ._generic import GenericRowHandler
from ...services import (
    create_experiment_run_complete,
)


class ExperimentRunRowHandler(GenericRowHandler):
    def __init__(self, experiment_type_obj, instrument, container, start_date,
                 sample_rows, properties, protocols_dict, properties_by_name_dict):
        super().__init__()

        # Calling the service creator for ExperimentRun
        if self.errors == {}:
            try:
                experiment_run, self.errors = create_experiment_run_complete(experiment_type_obj, instrument, container, start_date,
                 sample_rows, properties, protocols_dict, properties_by_name_dict)
            except Exception as e:
                self.errors["experiment_run"] = e


    def get_result(self):
        return super().get_result()
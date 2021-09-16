from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.process import create_processes_for_experiment_from_protocols_dict
from fms_core.services.property_value import create_properties_from_values_and_types
from fms_core.services.experiment_run import (create_experiment_run, associate_samples_to_experiment_run)


class ExperimentRunRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row(self, **kwargs):
        if len(kwargs['sample_rows_info']) < 1:
            self.errors['samples'] = f"No samples are associated to this experiment"

        return super(self.__class__, self).process_row(**kwargs)


    def process_row_inner(self, experiment_type_obj, instrument, container, start_date,
                    sample_rows_info, properties, protocols_dict, properties_by_name_dict):

        comment = f"Automatically generated via experiment run creation on {datetime.utcnow().isoformat()}Z"

        top_process_obj, experiment_processes_by_protocol_id, self.errors['process'], self.warnings['process'] = \
            create_processes_for_experiment_from_protocols_dict(protocols_objs_dict=protocols_dict,
                                                                creation_comment=comment)

        experiment_run, self.errors['experiment'], self.warnings['experiment'] = \
            create_experiment_run(experiment_type_obj,
                                  top_process_obj,
                                  instrument,
                                  container,
                                  start_date,
                                  )

        if experiment_run:
            _, self.errors['properties'], self.warnings['properties'] = \
                create_properties_from_values_and_types(properties, properties_by_name_dict,
                                                        experiment_processes_by_protocol_id)
            print('experiment_run row-handler - properties/errors', self.errors['properties'])

            samples, self.errors['samples'], self.warnings['samples'] = \
                associate_samples_to_experiment_run(experiment_run, sample_rows_info)
            print('experiment_run row-handler- samples/errors', self.errors['samples'])
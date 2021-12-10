from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.services.experiment_run import create_experiment_run

from fms_core.services.instrument import get_instrument
from fms_core.services.container import create_container

class ExperimentRunRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row(self, **kwargs):
        if len(kwargs['sample_rows_info']) < 1:
            self.errors['samples'] = f"No samples are associated to this experiment"

        return super(self.__class__, self).process_row(**kwargs)


    def process_row_inner(self, experiment_run_name, run_type_obj, instrument, container, start_date, comment,
                          sample_rows_info, process_properties, protocols_dict):

        instrument_obj, self.errors['instrument'], self.warnings['instrument'] = get_instrument(instrument['name'])

        container_obj, self.errors['container'], self.warnings['container'] = create_container(barcode=container['barcode'],
                                                                                               kind=container['kind'],
                                                                                               coordinates=None,
                                                                                               creation_comment=comment)

        if run_type_obj and instrument_obj and container_obj:
            _, self.errors['experiment'], self.warnings['experiment'] = create_experiment_run(experiment_run_name,
                                                                                              run_type_obj,
                                                                                              instrument_obj,
                                                                                              container_obj,
                                                                                              start_date,
                                                                                              sample_rows_info,
                                                                                              process_properties,
                                                                                              comment,
                                                                                              protocols_dict)
        else:
            self.errors['experiment'] = f"Errors prevent the creation of the experiment."

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
                          sample_rows_info, process_properties, protocols_dict, imported_template=None):

        instrument_obj, self.errors['instrument'], self.warnings['instrument'] = get_instrument(instrument['name'])

        container_obj, self.errors['container'], self.warnings['container'] = create_container(barcode=container['barcode'],
                                                                                               kind=container['kind'],
                                                                                               coordinates=None,
                                                                                               creation_comment=comment)
        # Add a warning if any of the samples have a failed qc flag
        if not all([sample["sample_obj"].quantity_flag and sample["sample_obj"].quality_flag for sample in sample_rows_info]):
            self.warnings["source_sample"] = (f"Some samples in the experiment {experiment_run_name} have failed QC.")

        if run_type_obj and instrument_obj and container_obj:
            _, self.errors['experiment'], self.warnings['experiment'] = create_experiment_run(experiment_run_name,
                                                                                              run_type_obj,
                                                                                              instrument_obj,
                                                                                              container_obj,
                                                                                              start_date,
                                                                                              sample_rows_info,
                                                                                              process_properties,
                                                                                              comment,
                                                                                              protocols_dict,
                                                                                              imported_template)
        else:
            self.errors['experiment'] = f"Errors prevent the creation of the experiment."

from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.template_importer._constants import LOAD_ALL
from fms_core.services.sample import get_sample_from_container


class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, barcode, coordinates, volume_used, platform):
        # Calling the service creator for Samples in ExperimentRun
        sample, self.errors['container'], self.warnings['container'] = get_sample_from_container(barcode=barcode, coordinates=coordinates)

        if sample is not None:
            # Set the actual volumed_used in case the load all option was used
            volume_used = sample.volume if volume_used == LOAD_ALL else volume_used

            self.row_object = sample

            for derived_by_sample in sample.derived_by_samples.all():
                if derived_by_sample.project_id is None:
                    self.errors["project"].append(f"Samples must be assigned to a project before running an experiment on them.")

            for derived_sample in sample.derived_samples.all():
                if derived_sample.library is not None and platform != derived_sample.library.platform:
                    self.errors["platform"].append(f"Library {derived_sample.biosample.alias} design ({derived_sample.library.platform.name}) "
                                                f"does not match the experiment platform ({platform.name}).")

            # Add a warning if the sample has failed qc
            if sample.failed_qc:
                self.warnings["qc_flags"] = ("Sample {0} has failed QC.", [sample.name])

            if not volume_used:
                self.errors['volume_used'] = f"Volume used must be entered"
            elif sample and volume_used > sample.volume:
                self.errors['volume_used'] = f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample.volume})"
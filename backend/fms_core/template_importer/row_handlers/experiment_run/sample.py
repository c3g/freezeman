from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container


class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, barcode, coordinates, volume_used):
        # Calling the service creator for Samples in ExperimentRun
        sample, self.errors['container'], self.warnings['container'] = get_sample_from_container(barcode=barcode, coordinates=coordinates)

        self.row_object = sample

        # Add a warning if the sample has failed qc
        if any([sample.quality_flag is False, sample.quantity_flag is False]):
            self.warnings["qc_flags"] = (f"Sample {sample.name} has failed QC.")

        if not volume_used:
            self.errors['volume_used'] = f"Volume used must be entered"
        elif sample and volume_used > sample.volume:
            self.errors['volume_used'] = f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample.volume})"
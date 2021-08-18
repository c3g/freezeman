from fms_core.import_tool.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container

from ....utils import (
    blank_str_to_none,
    float_to_decimal,
)

class SampleRowHandler(GenericRowHandler):
    def __init__(self, row_identifier):
        super().__init__(row_identifier)


    def process_row(self, barcode, coordinates, volume_used):
        # Calling the service creator for Samples in ExperimentRun
        if self.errors == {}:
            sample, self.errors = get_sample_from_container(barcode=barcode,
                                                            coordinates=coordinates)
            self.row_object = sample

            volume_used = float_to_decimal(blank_str_to_none(volume_used))
            if not volume_used:
                self.errors['volume_used'] = f"Volume used must be entered"
            elif sample and volume_used > sample.volume:
                self.errors['volume_used'] = f"Volume used ({volume_used}) exceeds the volume of the sample ({sample.volume})"

        return super().get_result()
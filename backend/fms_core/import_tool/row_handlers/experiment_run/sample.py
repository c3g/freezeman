from fms_core.import_tool.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container


class SampleRowHandler(GenericRowHandler):
    def __init__(self, row_identifier):
        super().__init__(row_identifier)


    def process_row(self, barcode, coordinates, volume_used):
        # Calling the service creator for Samples in ExperimentRun
        print('start experiment run sample row handler')
        if self.errors == {}:
            sample, self.errors['container'] = get_sample_from_container(barcode=barcode,
                                                                         coordinates=coordinates)
            self.row_object = sample

            if not volume_used:
                self.errors['volume_used'] = f"Volume used must be entered"
            elif sample and volume_used > sample.volume:
                self.errors['volume_used'] = f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample.volume})"

        return super().get_result()
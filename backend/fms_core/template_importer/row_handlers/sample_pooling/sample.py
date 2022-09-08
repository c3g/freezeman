
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container

class SamplesToPoolRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, source_sample, volume_used, comment):

        sample, self.errors["source_sample"], self.warnings["source_sample"] = get_sample_from_container(barcode=source_sample["barcode"],coordinates=source_sample["coordinates"])

        if volume_used is None:
            self.errors["volume_used"] = f"Volume used is required."
        elif volume_used <= 0:
            self.errors["volume_used"] = f"Volume used ({volume_used}) is invalid."
        elif sample and sample.volume < volume_used:
            self.errors["volume_used"] = f"Volume used ({volume_used} uL) exceeds the current volume of the sample ({sample.volume} uL)."

        self.row_object = {
            "Source Sample": sample,
            "Source Container Barcode": source_sample["barcode"],
            "Source Container Coordinate": source_sample["coordinates"],
            "Volume Used (uL)": volume_used,
            "Comment": comment,
        }
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

class PoolPlanningRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, samples_info, pool):
        # The sample object in samples_info are the samples before normalization. 
        # Ensure there is samples_tied to the pool
        if samples_info is None:
            self.errors["source_sample"] = (f"Cannot find samples for pool {pool['name']}. "
                                            f"Make sure Pool Name column values "
                                            f"match between both template sheets.")
        else:
            set_type = set(sample["Source Sample"].is_library for sample in samples_info)
            pool_is_library = True
            # Add an error if the samples are not of the same type (sample mixed with library)
            if len(set_type) > 1:
                self.errors["source_sample"] = f"Source samples in pool {pool['name']} are not all libraries."
            # Add an error if we are pooling samples and they are not of the same sample kind
            elif not set_type.pop(): # len(set_type) = 1 and not set_type[0] => all pooled are samples
                self.errors["source_sample"] = f"Source samples in pool {pool['name']} are not libraries."

            if not self.errors["source_sample"]:
                self.row_object = {
                    'Pool Name': pool['name'],
                    'Destination Container Barcode': pool['container']['barcode'],
                    'Destination Container Coord': pool['coordinates'],
                    'Destination Container Name': pool['container']['name'],
                    'Destination Container Kind': pool['container']['kind'],
                    'Destination Parent Container Barcode': pool['container']['parent_barcode'],
                    'Destination Parent Container Coord': pool['container']['coordinates'],
                }


       
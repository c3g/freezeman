from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, is_container_valid_destination

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
            # Add an error if the samples are not of the same type (sample mixed with library)
            if len(set_type) > 1:
                self.errors["source_sample"] = f"Source samples in pool {pool['name']} are not all libraries."
            # Add an error if we are pooling samples and they are not of the same sample kind
            elif not set_type.pop(): # len(set_type) = 1 and not set_type[0] => all pooled are samples
                self.errors["source_sample"] = f"Source samples in pool {pool['name']} are not libraries."

            # Ensure the pool destination container exists or has enough information to be created.
            pool_destination_container_dict = pool["container"]
            parent_barcode = pool_destination_container_dict["parent_barcode"]

            if parent_barcode:
                pool_container_parent_obj, self.errors["pool_parent_container"], self.warnings["pool_parent_container"] = get_container(barcode=parent_barcode)
            else:
                pool_container_parent_obj = None

            _, self.errors["pool_container"], self.warnings['pool_container'] = is_container_valid_destination(pool_destination_container_dict['barcode'],
                                                                                                               pool["coordinates"],
                                                                                                               pool_destination_container_dict['kind'],
                                                                                                               pool_destination_container_dict['name'],
                                                                                                               pool_destination_container_dict['coordinates'],
                                                                                                               pool_container_parent_obj)
            
            if not self.errors:
                self.row_object = {
                    'Pool Name': pool['name'],
                    'Destination Container Barcode': pool['container']['barcode'],
                    'Destination Container Coord': pool['coordinates'],
                    'Robot Destination Container': '',
                    'Robot Destination Coord': '',
                    'Destination Container Name': pool['container']['name'],
                    'Destination Container Kind': pool['container']['kind'],
                    'Destination Parent Container Barcode': pool['container']['parent_barcode'],
                    'Destination Parent Container Coord': pool['container']['coordinates'],
                }


       
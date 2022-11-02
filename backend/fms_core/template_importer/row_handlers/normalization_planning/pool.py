from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, is_container_valid_destination
from fms_core.services.instrument import get_instrument_type
from fms_core.services.index import validate_indices, validate_distance_matrix

from fms_core.template_importer._constants import DEFAULT_INDEX_VALIDATION_THRESHOLD, INDEX_COLLISION_THRESHOLD

class PoolPlanningRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, samples_info, pool, seq_instrument_type):
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
                pool_is_library = False
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

            # Validate indices from the samples being pooled
            if pool_is_library and seq_instrument_type is not None:
                instrument_type_obj, self.errors["seq_instrument_type"], self.warnings["seq_instrument_type"] = get_instrument_type(seq_instrument_type)

                indices = []
                samples_name = []
                for sample in samples_info:
                    sample_name = sample["Source Sample"].name
                    for derived_sample in sample["Source Sample"].derived_samples.all():
                        indices.append(derived_sample.library.index)
                        samples_name.append(sample_name)
                results, _, _ = validate_indices(indices=indices, instrument_type=instrument_type_obj, threshold=INDEX_COLLISION_THRESHOLD)

                if not results["is_valid"]:
                    # Verify first for direct collision (raise error in this case)
                    index_errors = []
                    for i, index_ref in enumerate(indices):
                        for j, index_val in enumerate(indices):
                            index_distance = results["distances"][i][j]
                            if index_distance is not None and any(map(lambda x: x <= INDEX_COLLISION_THRESHOLD, index_distance)):
                                index_errors.append(f"Index {index_ref.name} for sample {samples_name[i]} and "
                                                    f"Index {index_val.name} for sample {samples_name[j]} are not different "
                                                    f"for index validation length ({results['validation_length_3prime']}, "
                                                    f"{results['validation_length_5prime']}")
                    self.errors["index_colision"] = index_errors
                else:
                  # Verify then for near near collision for distances not higher than the default threshold (raise warning in this case)
                  is_valid, collisions = validate_distance_matrix(results["distances"], DEFAULT_INDEX_VALIDATION_THRESHOLD)
                  if not is_valid:
                      index_warnings = []
                      for i, j in collisions:
                          index_distance = results["distances"][i][j]
                          index_warnings.append(f"Index {indices[i].name} for sample {samples_name[i]} and "
                                                f"Index {indices[j].name} for sample {samples_name[j]} are not different enough {index_distance}.")

            if self.has_errors():
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
                    'Seq Instrument Type': seq_instrument_type,
                }

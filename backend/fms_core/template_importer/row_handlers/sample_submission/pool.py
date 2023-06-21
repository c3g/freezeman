from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import pool_submitted_samples
from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.instrument import get_instrument_type
from fms_core.services.index import validate_distance_matrix, validate_indices
from datetime import datetime
from fms_core.template_importer._constants import DEFAULT_INDEX_VALIDATION_THRESHOLD, INDEX_COLLISION_THRESHOLD
import logging
logger = logging.getLogger(__file__)

class PoolsRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, samples_info, pool, seq_instrument_type, reception_date, comment):
        # Ensure there is samples_tied to the pool
        if samples_info is None:
            self.errors["source_sample"] = (f"Cannot find samples for pool {pool['name']}. "
                                            f"Make sure SampleSubmission sheet Pool Name column values "
                                            f"match a value in PoolSubmission sheet Pool Name column.")
        else:
            # Validate that all libraries have the same platform
            set_platform = set(sample['library'].platform_id for sample in samples_info)
            if len(set_platform) > 1:
                self.errors["source_sample"] = (f"Libraries in pool {pool['name']} must have the same platform.")

            # Get/Create pool container
            pool_container_dict = pool["container"]

            parent_barcode = pool_container_dict["parent_barcode"]
            d1 = datetime.now()
            if parent_barcode:
                container_parent, self.errors['parent_container'], self.warnings['parent_container'] = get_container(
                    barcode=parent_barcode)
            else:
                container_parent = None
            logger.info("pools_fetch_parent_container_end: "+str(((datetime.now())-d1).total_seconds()))
            d1 = datetime.now()
            container_destination, _, self.errors['container'], self.warnings['container'] = get_or_create_container(
                barcode=pool_container_dict['barcode'],
                kind=pool_container_dict['kind'],
                name=pool_container_dict['name'],
                coordinates=pool_container_dict['coordinates'],
                container_parent=container_parent)

            logger.info("pools_fetch_container_end: "+str(((datetime.now())-d1).total_seconds()))
            # Validate indices from the samples being pooled
            if seq_instrument_type is not None:
                d1 = datetime.now()
                instrument_type_obj, self.errors["seq_instrument_type"], self.warnings["seq_instrument_type"] = get_instrument_type(seq_instrument_type)
                logger.info("pools_fetch_instrument_type_end: "+str(((datetime.now())-d1).total_seconds()))
                indices = []
                samples_name = []
                d1 = datetime.now()
                for sample in samples_info:
                    sample_name = sample["alias"]
                    indices.append(sample["library"].index)
                    samples_name.append(sample_name)
                results, _, _ = validate_indices(indices=indices, instrument_type=instrument_type_obj, threshold=INDEX_COLLISION_THRESHOLD)
                logger.info("pools_validate_indices_end: "+str(((datetime.now())-d1).total_seconds()))
                if not results["is_valid"]:
                    # Verify first for direct collision (raise error in this case)
                    d1 = datetime.now()
                    index_errors = []
                    for i, index_ref in enumerate(indices):
                        for j, index_val in enumerate(indices):
                            index_distance = results["distances"][i][j]
                            if index_distance is not None and all(map(lambda x: x <= INDEX_COLLISION_THRESHOLD, index_distance)):
                                index_errors.append(f"Index {index_ref.name} for sample {samples_name[i]} and "
                                                    f"Index {index_val.name} for sample {samples_name[j]} are not different "
                                                    f"for index validation length ({results['validation_length_3prime']}, "
                                                    f"{results['validation_length_5prime']}).")
                    self.errors["index_collision"] = index_errors
                    logger.info("Verify first for direct collision: "+str(((datetime.now())-d1).total_seconds()))
                else:
                  d1 = datetime.now()
                  # Verify then for near near collision for distances not higher than the default threshold (raise warning in this case)
                  is_valid, collisions = validate_distance_matrix(results["distances"], DEFAULT_INDEX_VALIDATION_THRESHOLD)
                  if not is_valid:
                      index_warnings = []
                      for i, j in collisions:
                          index_distance = results["distances"][i][j]
                          index_warnings.append(f"Index {indices[i].name} for sample {samples_name[i]} and "
                                                f"Index {indices[j].name} for sample {samples_name[j]} are not different enough {index_distance}.")
                      self.warnings["index_collision"] = index_warnings
                  logger.info("Verify then for near near collision: "+str(((datetime.now())-d1).total_seconds()))
            d1 = datetime.now()
            # Pool samples
            pool, self.errors['pool'], self.warnings['pool'] = pool_submitted_samples(samples_info=samples_info,
                                                                                      pool_name=pool['name'],
                                                                                      container_destination=container_destination,
                                                                                      coordinates_destination=pool['coordinates'],
                                                                                      reception_date=reception_date,
                                                                                      comment=comment)
            logger.info("pool_submitted_samples_end: "+str(((datetime.now())-d1).total_seconds()))


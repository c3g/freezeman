from decimal import Decimal
from fms_core.models.derived_by_sample import DerivedBySample
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import pool_submitted_samples
from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.instrument import get_instrument_type
from fms_core.services.index import validate_distance_matrix, validate_indices

from fms_core.template_importer._constants import DEFAULT_INDEX_VALIDATION_THRESHOLD, INDEX_COLLISION_THRESHOLD

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
            if parent_barcode:
                container_parent, _, self.errors['parent_container'], self.warnings['parent_container'] = \
                    get_or_create_container(barcode=parent_barcode,
                                            kind=pool_container_dict["parent_kind"],
                                            name=pool_container_dict["parent_name"])
            else:
                container_parent = None

            container_destination, _, self.errors['container'], self.warnings['container'] = \
                get_or_create_container(barcode=pool_container_dict['barcode'],
                                        kind=pool_container_dict['kind'],
                                        name=pool_container_dict['name'],
                                        coordinates=pool_container_dict['coordinates'],
                                        container_parent=container_parent)

            # Validate indices from the samples being pooled
            if seq_instrument_type is not None:
                instrument_type_obj, self.errors["seq_instrument_type"], self.warnings["seq_instrument_type"] = get_instrument_type(seq_instrument_type)
                if instrument_type_obj is not None:
                    indices = []
                    samples_name = []
                    for sample in samples_info:
                        sample_name = sample["alias"]
                        indices.append(sample["library"].index)
                        samples_name.append(sample_name)
                    results, self.errors["invalid_index"], _ = validate_indices(indices=indices,
                                                                                index_read_direction_5_prime=instrument_type_obj.index_read_5_prime,
                                                                                index_read_direction_3_prime=instrument_type_obj.index_read_3_prime,
                                                                                threshold=INDEX_COLLISION_THRESHOLD)

                    if not results["is_valid"] and results.get("distances", None) is not None:
                        # Verify first for direct collision (raise error in this case)
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
                    elif results["is_valid"]:
                      # Verify then for near near collision for distances not higher than the default threshold (raise warning in this case)
                      is_valid, collisions = validate_distance_matrix(results["distances"], DEFAULT_INDEX_VALIDATION_THRESHOLD)
                      if not is_valid:
                          index_warnings = []
                          for i, j in collisions:
                              index_distance = results["distances"][i][j]
                              index_warnings.append(("Index {0} for sample {1} and "
                                                    "Index {2} for sample {3} are not different enough {4}.", [indices[i].name, samples_name[i], indices[j].name, samples_name[j], index_distance]))
                          self.warnings["index_collision"] = index_warnings

            equal_volume_ratio = True
            for sample in samples_info:
                if sample.get("volume_ratio", None) is not None:
                    equal_volume_ratio = False

            exp = Decimal(f'1E-{DerivedBySample.VOLUME_RATIO_DECIMAL_PLACES}')
            total_volume_ratio = 0
            for sample in samples_info:
                volume_ratio = sample.get("volume_ratio", None)
                if not equal_volume_ratio:
                    if volume_ratio is None:
                        self.errors["volume_ratio"] = [f"All samples in the pool {pool['name']} must either define volume ratio or not at the same time."]
                        break
                    else:
                        total_volume_ratio += Decimal(volume_ratio).quantize(exp)
                else:
                    if volume_ratio:
                        self.errors["volume_ratio"] = [f"All samples in the pool {pool['name']} must either define volume ratio or not at the same time."]
                        break
                    else:
                        sample["volume_ratio"] = (Decimal(1) / Decimal(len(samples_info))).quantize(exp)
                        self.warnings["volume_ratio"] = [(
                            "Volume ratio for all samples in the pool {0} is set to equal value of {1}.",
                            (pool['name'], float(sample["volume_ratio"]))
                        )]
                        total_volume_ratio += sample["volume_ratio"]
            if equal_volume_ratio and samples_info:
                if total_volume_ratio < 1:
                    delta = (Decimal(1) - total_volume_ratio).quantize(exp)
                    samples_info[0]["volume_ratio"] += delta
                    self.warnings["volume_ratio"].append((
                        "The volume ratio of the first sample in the pool {0} is increased by {1} to make the total volume ratio equal to 1.",
                        (pool['name'], delta)
                    ))
                elif total_volume_ratio > 1:
                    delta = (total_volume_ratio - Decimal(1)).quantize(exp)
                    samples_info[0]["volume_ratio"] -= delta
                    self.warnings["volume_ratio"].append((
                        "The volume ratio of the first sample in the pool {0} is decreased by {1} to make the total volume ratio equal to 1.",
                        (pool['name'], float(delta))
                    ))
                total_volume_ratio = 1
            if not self.errors.get("volume_ratio") and total_volume_ratio != 1:
                self.errors["volume_ratio"].append(f"Total volume ratio of the samples in the pool {pool['name']} must add up to exactly 1. ({float(total_volume_ratio)})")

            # Pool samples
            pool, self.errors['pool'], self.warnings['pool'] = pool_submitted_samples(samples_info=samples_info,
                                                                                      pool_name=pool['name'],
                                                                                      pool_volume=pool['volume'],
                                                                                      container_destination=container_destination,
                                                                                      coordinates_destination=pool['coordinates'],
                                                                                      reception_date=reception_date,
                                                                                      comment=comment)
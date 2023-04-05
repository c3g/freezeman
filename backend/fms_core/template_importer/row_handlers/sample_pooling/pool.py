
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.process import create_process
from fms_core.services.sample import pool_samples
from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.instrument import get_instrument_type
from fms_core.services.index import validate_indices

from fms_core.template_importer._constants import DEFAULT_INDEX_VALIDATION_THRESHOLD

class PoolsRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, protocol, imported_template, samples_info, pool, seq_instrument_type, pooling_date, comment):
        # Ensure there is samples_tied to the pool
        if samples_info is None:
            self.errors["source_sample"] = (f"Cannot find samples for pool {pool['name']}. "
                                            f"Make sure SamplesToPool sheet Pool Name column values "
                                            f"match a value in Pools sheet Pool Name column.")
        else:
            set_type = set(sample["Source Sample"].is_library for sample in samples_info)
            pool_is_library = True
            # Add an error if the samples are not of the same type (sample mixed with library)
            if len(set_type) > 1:
                self.errors["source_sample"] = (f"Source samples in pool {pool['name']} are not all either samples or libraries.")
            # Add an error if we are pooling samples and they are not of the same sample kind
            elif not set_type.pop(): # len(set_type) = 1 and not set_type[0] => all pooled are samples
                pool_is_library = False
                set_kind = set(sample["Source Sample"].derived_samples.first().sample_kind.name for sample in samples_info)
                # Assumes source sample pools did not allow different individuals to be pooled
                set_individual = set(sample["Source Sample"].derived_samples.first().biosample.individual_id for sample in samples_info)
                if len(set_kind) > 1: # len(set_kind) > 1 => not all same kind
                    self.errors["source_sample"] = (f"Source samples in pool {pool['name']} must be of the same sample kind (when pooling samples). "
                                                    f"Samples to be pooled are of the following kinds: {set_kind}.")
                if len(set_individual) > 1: # len(set_individual) > 1 => not all same individual
                    self.errors["source_sample"] = (f"Source samples in pool {pool['name']} must be from the same individual. "
                                                    f"Samples to be pooled are of the following individuals: {set_individual}.")

            if pool_is_library:
                # Validate that all libraries have the same platform
                set_platform = set()
                for sample in samples_info:
                    for derived_sample in sample["Source Sample"].derived_samples.all():
                        set_platform.add(derived_sample.library.platform_id)
                if len(set_platform) > 1:
                    self.errors["source_sample"] = (f"Libraries in pool {pool['name']} must have the same platform.")

                # Add a warning if the concentration of the libraries are not within a tolerance
                TOLERANCE = 1 # Tolerance can be tweaked to be more or less permissive
                for sample_tested in samples_info:
                    concentrations = [((sample["Source Sample"].concentration * sample["Volume Used"]) / sample[["Volume In Pool"]]) for sample in samples_info if sample["Source Sample"].id != sample_tested["Source Sample"].id]
                    avg_concentration = sum(concentrations) / len(concentrations)
                    tested_concentration = (sample_tested["Source Sample"].concentration * sample_tested["Volume Used"]) / sample_tested["Volume In Pool"]
                    if abs(tested_concentration - avg_concentration) > TOLERANCE:
                        self.warnings["concentration"] = [(f"Source sample {sample_tested['Source Sample'].name} in pool {pool['name']} have concentration that is more than "
                                                          f"{TOLERANCE} ng/uL away from the average concentration of the other samples in the pool. "
                                                          f"This is likely normal if the sample is a negative control.")]
            
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
                results, _, _ = validate_indices(indices=indices, instrument_type=instrument_type_obj, threshold=DEFAULT_INDEX_VALIDATION_THRESHOLD)

                if not results["is_valid"]:
                    index_warnings = []
                    for i, index_ref in enumerate(indices):
                        for j, index_val in enumerate(indices):
                            index_distance = results["distances"][i][j]
                            if index_distance is not None and all(map(lambda x: x <= DEFAULT_INDEX_VALIDATION_THRESHOLD, index_distance)):
                                index_warnings.append(f"Index {index_ref.name} for sample {samples_name[i]} and "
                                                      f"Index {index_val.name} for sample {samples_name[j]} are not different enough {index_distance}.")
                    self.warnings["index_colision"] = index_warnings

            # Create a process for each pool created
            process_by_protocol, self.errors["process"], self.warnings["process"] = create_process(protocol=protocol,
                                                                                                   creation_comment=comment,
                                                                                                   create_children=False,
                                                                                                   children_protocols=None,
                                                                                                   imported_template=imported_template)
            process = process_by_protocol[protocol.id]

            # Get/Create pool container
            container_destination_dict = pool["container"]

            parent_barcode = container_destination_dict["parent_barcode"]
            if parent_barcode:
                container_parent, self.errors['parent_container'], self.warnings['parent_container'] = get_container(barcode=parent_barcode)
            else:
                container_parent = None

            container_destination, _, self.errors['container'], self.warnings['container'] = get_or_create_container(barcode=container_destination_dict['barcode'],
                                                                                                                     kind=container_destination_dict['kind'].lower(),
                                                                                                                     name=container_destination_dict['name'],
                                                                                                                     coordinates=container_destination_dict['coordinates'],
                                                                                                                     container_parent=container_parent)

            # Pool samples
            pool, self.errors["pool"], self.warnings["pool"] = pool_samples(process=process,
                                                                            samples_info=samples_info,
                                                                            pool_name=pool["name"],
                                                                            container_destination=container_destination,
                                                                            coordinates_destination=pool["coordinates"],
                                                                            execution_date=pooling_date)

        
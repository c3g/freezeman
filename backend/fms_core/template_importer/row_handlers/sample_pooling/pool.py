
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.process import create_process
from fms_core.services.sample import pool_samples
from fms_core.services.container import get_container, get_or_create_container

class PoolsRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, protocol, imported_template, samples_info, pool, pooling_date, comment):
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
                set_individual = set(sample["Source Sample"].derived_samples.first().biosample.individual for sample in samples_info)
                if len(set_kind) > 1: # len(set_kind) > 1 => not all same kind
                    self.errors["source_sample"] = (f"Source samples in pool {pool['name']} must be of the same sample kind (when pooling samples). "
                                                    f"Samples to be pooled are of the following kinds: {set_kind}.")
                if len(set_individual) > 1: # len(set_individual) > 1 => not all same individual
                    self.errors["source_sample"] = (f"Source samples in pool {pool['name']} must be from the same individual. "
                                                    f"Samples to be pooled are of the following individuals: {set_individual}.")

            if pool_is_library:                                 
                # Add a warning if the concentration of the libraries are not within a tolerance
                TOLERANCE = 1 # Tolerance can be tweaked to be more or less permissive
                concentrations = [sample["Source Sample"].concentration for sample in samples_info]
                avg_concentration = sum(concentrations) / len(concentrations)
                if any(abs(concentration - avg_concentration) > TOLERANCE for concentration in concentrations):
                    self.warnings["concentration"] = [(f"Source samples in pool {pool['name']} have concentrations that are more than "
                                                       f"{TOLERANCE} ng/uL away from the average concentration of the pool.")]
            
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

        
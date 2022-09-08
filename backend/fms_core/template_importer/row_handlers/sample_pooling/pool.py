
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.process import create_process
from fms_core.services.sample import pool_samples
from fms_core.services.container import get_container, get_or_create_container

class PoolsRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, protocol, imported_template, samples_info, pool, pooling_date, comment):
        # Add an error if the samples are not of the same type (sample mixed with library)
        if len(set(sample["Source Sample"].isLibrary for sample in samples_info)) > 1:
            self.errors["source_sample"].append(f"Source samples in pool {pool['name']} are not all either samples or libraries.")

        # Add a warning if the concentration of the samples/libraries are not within a tolerance
        TOLERANCE = 1 # Tolerance can be tweaked to be more or less permissive
        concentrations = [sample["Source Sample"].concentration for sample in samples_info]
        avg_concentration = sum(concentrations) / len(concentrations)
        if any(abs(concentration - avg_concentration) > TOLERANCE for concentration in concentrations):
            self.warnings["concentration"].append(f"Source samples in pool {pool['name']} have concentrations that are more than "
                                                  f"{TOLERANCE} ng/uL away from the average concentration of the pool.")
        
        # Create a process for each pool created
        process, self.errors["process"], self.warnings["process"] = create_process(protocol=protocol,
                                                                                   creation_comment=comment,
                                                                                   create_children=False,
                                                                                   children_protocols=None,
                                                                                   imported_template=imported_template)
      
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
                                                                        container_destination=container_destination,
                                                                        execution_date=pooling_date)

        
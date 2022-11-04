from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import pool_submitted_samples
from fms_core.services.container import get_container, get_or_create_container


class PoolsRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, samples_info, pool, reception_date, comment):
        # Ensure there is samples_tied to the pool
        if samples_info is None:
            self.errors["source_sample"] = (f"Cannot find samples for pool {pool['name']}. "
                                            f"Make sure SampleSubmission sheet Pool Name column values "
                                            f"match a value in PoolSubmission sheet Pool Name column.")
        else:
            # Validate that all libraries have the same platform
            set_platform = set(sample['library'].platform_id for sample in samples_info)
            if len(set_platform) > 1:
                self.errors["source_sample"] = (f"Libraries in pool {pool['name']} must have the same platform .")

            # Get/Create pool container
            pool_container_dict = pool["container"]

            parent_barcode = pool_container_dict["parent_barcode"]
            if parent_barcode:
                container_parent, self.errors['parent_container'], self.warnings['parent_container'] = get_container(
                    barcode=parent_barcode)
            else:
                container_parent = None

            container_destination, _, self.errors['container'], self.warnings['container'] = get_or_create_container(
                barcode=pool_container_dict['barcode'],
                kind=pool_container_dict['kind'].lower(),
                name=pool_container_dict['name'],
                coordinates=pool_container_dict['coordinates'],
                container_parent=container_parent)

            # Pool samples
            pool, self.errors['pool'], self.warnings['pool'] = pool_submitted_samples(samples_info=samples_info,
                                                                                      pool_name=pool['name'],
                                                                                      container_destination=container_destination,
                                                                                      coordinates_destination=pool['coordinates'],
                                                                                      reception_date=reception_date,
                                                                                      comment=comment)

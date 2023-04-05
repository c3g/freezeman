
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container

class SamplesToPoolRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, source_sample, pool, volume_used, volume_in_pool, comment, workflow):

        sample, self.errors["source_sample"], self.warnings["source_sample"] = get_sample_from_container(barcode=source_sample["barcode"],coordinates=source_sample["coordinates"])

        # Add a warning if the sample has failed qc
        if any([sample.quality_flag is False, sample.quantity_flag is False]):
            self.warnings["qc_flags"] = (f"Sample {sample.name} has failed QC.")

        if volume_used is None:
            self.errors["volume_used"] = f"Volume used is required."
        elif volume_used <= 0:
            self.errors["volume_used"] = f"Volume used ({volume_used}) is invalid. It must be greater than 0."
        elif sample and sample.volume < volume_used:
            self.errors["volume_used"] = f"Volume used ({volume_used} uL) exceeds the current volume of the sample ({sample.volume} uL)."

        if volume_in_pool is None:
            self.errors["volume_in_pool"] = (f"Volume In Pool is required."
                                             f"It provides the final normalized volume used for pooling. May be equal to Volume used if not diluted.")
        elif volume_in_pool <= 0:
            self.errors["volume_in_pool"] = f"Volume in pool ({volume_in_pool}) is invalid. It must be greater than 0."

        # Ensure concentration related information is present for library, but do not enforce the quality control. Might have information provided at reception.
        if sample and sample.is_library and sample.concentration is None:
            self.errors["source_sample"].append(f"Library must have a measured concentration to be pooled. Complete quality control if you want to pool.")
        if sample and sample.is_library and not all(derived_sample.library and derived_sample.library.library_size is not None for derived_sample in sample.derived_samples.all()):
            self.errors["source_sample"].append(f"Library must have a measured library size to be pooled. Complete quality control if you want to pool.")

        # Prevent pooling of samples that are not extracted.
        if sample and not sample.derived_samples.first().sample_kind.is_extracted:
            self.errors["source_sample"].append(f"Sample must be extracted before being pooled.")

        # Prevent pooling of samples that are not assigned to a project
        if sample and any(derived_sample.project_id is None for derived_sample in sample.derived_samples.all()):
            self.errors["project"].append(f"Samples must be assigned to a project before being pooled.")

        if pool["pool_name"] is None:
            self.errors["pool_name"] = f"Pool Name is required."
        elif pool["pool_name"] not in pool["pool_set"]:
            self.errors["pool_name"] = f"Pool Name {pool['pool_name']} must match a pool on the Pools sheet {pool['pool_set']}."

        self.row_object = {
            "Source Sample": sample,
            "Source Container Barcode": source_sample["barcode"],
            "Source Container Coordinate": source_sample["coordinates"],
            "Source Depleted": source_sample["depleted"],
            "Volume Used": volume_used,
            "Volume In Pool": volume_in_pool,
            "Comment": comment,
            "Workflow": workflow,
        }
from typing import Set

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.models import DerivedSample, Index
from fms_core.services.library import update_library

class IndexUpdateRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, library, index):
        if index["old_index"] is None:
            self.errors["index"].append(f"Providing the index value to replace is required for validation.")
        if index["new_index"] is None:
            self.errors["index"].append(f"A new value for the index needs to be provided.")

        if not self.errors["index"]:
            try:
                derived_sample = DerivedSample.objects.get(samples__container__barcode=library["barcode"], samples__coordinate__name=library["coordinates"], library__index__name=index["old_index"])
                if derived_sample.library is not None:
                    try:
                        # get the new index id
                        index = Index.objects.get(name=index["new_index"])
                        # List all libraries that matches the targeted derived sample library
                        # find root library derived sample
                        root_library_derived_sample = None
                        current_derived_sample = derived_sample
                        while current_derived_sample and current_derived_sample.library is not None:
                            root_library_derived_sample = current_derived_sample
                            current_derived_sample = current_derived_sample.derived_from
                        # descend the tree from root library
                        def get_derived_samples(derived_sample: DerivedSample) -> Set[DerivedSample]:
                            derived_samples = {derived_sample}
                            for child_derived_sample in derived_sample.derived_to.all():
                                derived_samples.update(get_derived_samples(child_derived_sample))
                            return derived_samples
                        
                        derived_sample_lineage = get_derived_samples(root_library_derived_sample)

                        # Apply the new index to the library identified
                        for updated_derived_sample in derived_sample_lineage:
                            _, self.errors["index_update"], self.warnings["index_update"] = update_library(derived_sample=updated_derived_sample, index=index)

                        if len(derived_sample_lineage) > 1:
                            self.warnings["multiple updates"] = f"A total of {len(derived_sample_lineage)} derived libraries that share lineage with the updated library were changed."
                            
                    except Index.DoesNotExist:
                        self.errors["index"].append(f"No index found for name [{index['new_index']}].")
                    except Index.MultipleObjectsReturned:
                        self.errors["index"].append(f"Multiple indices found for name [{index['new_index']}]. Should be unique.")
                else:
                    self.errors["library"].append(f"Sample [{derived_sample.biosample.alias}] is not a library. It does not have an index.")
            except DerivedSample.DoesNotExist:
                self.errors["library"].append(f"Library not found with given parameters: container barcode[{library['barcode']}], coordinates[{library['coordinates']}] and old index[{index['old_index']}].")
            except DerivedSample.MultipleObjectsReturned:
                self.errors["library"].append(f"Multiple libraries found for given parameters: container barcode[{library['barcode']}], coordinates[{library['coordinates']}] and old index[{index['old_index']}]. Provide a unique identifier.")
            
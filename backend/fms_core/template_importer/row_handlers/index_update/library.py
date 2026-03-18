from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.models import DerivedSample, Index
from fms_core.services.library import update_library_index

class IndexUpdateRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, library, index):
        samples_impacted = None

        if index["old_index"] is None:
            self.errors["index"].append(f"Providing the index value to replace is required for validation.")
        else:
            try:
                old_index_obj = Index.objects.get(name=index["old_index"])
            except Index.DoesNotExist:
                self.errors["index"].append(f"Index name provided for validation does not exist.")

        if index["new_index"] is None:
            self.errors["index"].append(f"A new value for the index needs to be provided.")
        else:
            try:
                new_index_obj = Index.objects.get(name=index["new_index"])
            except Index.DoesNotExist:
                self.errors["index"].append(f"No index found for name [{index['new_index']}].")
            except Index.MultipleObjectsReturned:
                self.errors["index"].append(f"Multiple indices found for name [{index['new_index']}]. Should be unique.")

        if not self.errors["index"]:
            try:
                derived_sample = DerivedSample.objects.get(samples__container__barcode=library["barcode"], samples__coordinate__name=library["coordinates"], library__index__name=index["old_index"], biosample__alias=library['alias'])
                if derived_sample.library is not None:
                    samples_impacted, self.errors["index_update"], self.warnings["index_update"] = update_library_index(derived_sample, new_index_obj, old_index_obj)
                else:
                    self.errors["library"].append(f"Sample [{derived_sample.biosample.alias}] is not a library. It does not have an index.")
            except DerivedSample.DoesNotExist:
                self.errors["library"].append(f"Library not found with given parameters: library[{library['alias']}], container barcode[{library['barcode']}], coordinates[{library['coordinates']}] and old index[{index['old_index']}].")
            except DerivedSample.MultipleObjectsReturned:
                self.errors["library"].append(f"Multiple libraries found for given parameters: library[{library['alias']}], container barcode[{library['barcode']}], coordinates[{library['coordinates']}] and old index[{index['old_index']}]. Provide a unique identifier.")

        if not self.has_errors():
            self.row_object = {
                "Library Name": library["alias"],
                "Library Container Barcode": library["barcode"],
                "Library Container Coord": library["coordinates"],
                "Old Index": index["old_index"],
                "New Index": index["new_index"],
                "Samples Impacted": samples_impacted or []
            }
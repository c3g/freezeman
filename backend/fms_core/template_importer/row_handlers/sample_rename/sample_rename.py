from typing import Set

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.models import DerivedSample, Index, Sample
from fms_core.services.library import update_library

from django.db.models import Q

class SampleRenameRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample):
        if sample["old_alias"] is None:
            self.errors["alias"].append(f"Providing the index value to replace is required for validation.")
        if sample["new_alias"] is None:
            self.errors["alias"].append(f"A new value for the index needs to be provided.")

        samples_impacted: Set[Sample] = set()

        if not self.errors["alias"]:
            sq_query = Q()
            try:
                if sample["index"]:
                    sq_query &= Q(library__index__name=sample["index"])
                if sample["coordinates"]:
                    sq_query &= Q(library__container__coordinate__name=sample["coordinates"])
                    # If coordinates are provided, barcode must also be provided to avoid ambiguity
                    sq_query &= Q(library_container__location__barcode=sample["barcode"])
                elif sample["barcode"]:
                    sq_query &= Q(library__container__barcode=sample["barcode"])

                sq_query &= Q(biosample__alias=sample["old_alias"])
                
                derived_sample = DerivedSample.objects.get(sq_query)

                derived_sample.biosample.alias = sample["new_alias"]
                derived_sample.biosample.save()
                samples_impacted.add(derived_sample.biosample)

            except DerivedSample.DoesNotExist:
                self.errors["alias"].append(f"No sample found with the provided criteria {sq_query}; please refine your criteria.")
            except DerivedSample.MultipleObjectsReturned:
                self.errors["alias"].append(f"Multiple samples found with the provided criteria to rename; please refine your criteria.")

        if not self.has_errors():
            self.row_object = {
                "Old Sample Name": sample["old_alias"],
                "New Sample Name": sample["new_alias"],
                "Container Barcode": sample["barcode"],
                "Container Coord": sample["coordinates"],
                "Index Name": sample["index"],
                "Samples Impacted": [sample for sample in samples_impacted]
            }
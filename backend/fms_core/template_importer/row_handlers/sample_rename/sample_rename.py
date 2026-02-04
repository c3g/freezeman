from typing import Set

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.models import DerivedBySample, Index, Sample
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

        if not self.errors["alias"]:
            sq_query = Q()
            try:
                if sample["index"]:
                    sq_query &= Q(derived_sample__library__index__name=sample["index"])
                if sample["coordinates"]:
                    sq_query &= Q(sample__container__coordinate__name=sample["coordinates"])
                    # If coordinates are provided, barcode must also be provided to avoid ambiguity
                    sq_query &= Q(sample__container__location__barcode=sample["barcode"])
                elif sample["barcode"]:
                    sq_query &= Q(sample__container__barcode=sample["barcode"])

                sq_query &= Q(derived_sample__biosample__alias=sample["old_alias"])
                
                derived_by_sample = DerivedBySample.objects.get(sq_query)

                derived_by_sample.derived_sample.biosample.alias = sample["new_alias"]
                derived_by_sample.derived_sample.biosample.save()

            except DerivedBySample.DoesNotExist:
                self.errors["alias"].append(f"No sample found with the provided criteria {sq_query}; please refine your criteria.")
            except DerivedBySample.MultipleObjectsReturned:
                self.errors["alias"].append(f"Multiple samples found with the provided criteria to rename; please refine your criteria.")

        if not self.has_errors():
            self.row_object = {
                "Old Sample Name": sample["old_alias"],
                "New Sample Name": sample["new_alias"],
                "Container Barcode": sample["barcode"],
                "Container Coord": sample["coordinates"],
                "Index Name": sample["index"],
            }
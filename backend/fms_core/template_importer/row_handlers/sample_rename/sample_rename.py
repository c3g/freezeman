from typing import Set

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.models import DerivedBySample, Index, Sample
from fms_core.services.library import update_library

from django.db.models import Q

class SampleRenameRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample):
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
            
            if sample["old_alias"]:
                sq_query &= Q(derived_sample__biosample__alias=sample["old_alias"])
            if sample["old_name"]:
                sq_query &= Q(sample__name=sample["old_name"])

            derived_by_sample = DerivedBySample.objects.get(sq_query)

            if sample["new_alias"]:
                derived_by_sample.derived_sample.biosample.alias = sample["new_alias"]
                derived_by_sample.derived_sample.biosample.save()
            if sample["new_name"]:
                derived_by_sample.sample.name = sample["new_name"]
                derived_by_sample.sample.save()

        except DerivedBySample.DoesNotExist:
            self.errors["rename"].append(f"No sample found with the criteria provided; please refine your criteria.")
        except DerivedBySample.MultipleObjectsReturned:
            self.errors["rename"].append(f"Multiple samples found with the provided criteria to rename; please refine your criteria.")

        if not self.has_errors():
            self.row_object = {
                "Old Sample Name": sample["old_alias"],
                "New Sample Name": sample["new_alias"],
                "Container Barcode": sample["barcode"],
                "Container Coord": sample["coordinates"],
                "Index Name": sample["index"],
            }
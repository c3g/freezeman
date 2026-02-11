from typing import Set, TypedDict

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.models import DerivedBySample, Index, Sample
from fms_core.services.library import update_library

from django.db.models import Q

class SampleRenameKwargs(TypedDict):
    barcode: str | None
    parent_barcode: str | None
    coordinates: str | None
    index: str | None
    old_alias: str | None
    new_alias: str | None
    old_name: str | None
    new_name: str | None

class SampleRenameRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample: SampleRenameKwargs):
        sq_query = Q()
        derived_by_sample = None
        try:
            if sample["index"]:
                sq_query &= Q(derived_sample__library__index__name=sample["index"])

            if sample["barcode"]:
                sq_query &= Q(sample__container__barcode=sample["barcode"])

            if sample["parent_barcode"]:
                sq_query &= Q(sample__container__location__barcode=sample["parent_barcode"])
            if sample["coordinates"]:
                sq_query &= Q(sample__container__coordinate__name=sample["coordinates"])

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
            count = DerivedBySample.objects.filter(sq_query).count()
            self.errors["rename"].append(f"{count} samples found with the provided criteria to rename; please refine your criteria.")

        if not self.has_errors():
            self.row_object = {
                "Sample Name": derived_by_sample.sample.name if derived_by_sample else sample["old_name"],
                "Sample Alias": derived_by_sample.derived_sample.biosample.alias if derived_by_sample else sample["old_alias"],
                "Container Barcode": derived_by_sample.sample.container.barcode if derived_by_sample else sample["barcode"],
                "Parent Container Barcode": derived_by_sample.sample.container.location.barcode if derived_by_sample else sample["parent_barcode"],
                "Container Coordinate": derived_by_sample.sample.container.coordinate.name if derived_by_sample else sample["coordinates"],
                "Index Name": derived_by_sample.derived_sample.library.index.name if derived_by_sample and derived_by_sample.derived_sample.library.index else sample["index"],
            }
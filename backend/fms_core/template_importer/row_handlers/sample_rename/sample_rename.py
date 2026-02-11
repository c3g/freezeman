from typing import Set, TypedDict

from fms_core.workbooks.sample_rename import HeaderNames
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
        dbs = None

        if not sample["new_alias"] and not sample["new_name"]:
            self.errors["rename"].append(f"At least one of '{HeaderNames.NEW_SAMPLE_ALIAS}' or '{HeaderNames.NEW_SAMPLE_NAME}' must be provided for renaming.")
            return

        try:
            if sample["index"]:
                sq_query &= Q(derived_sample__library__index__name=sample["index"])

            if sample["barcode"]:
                sq_query &= Q(sample__container__barcode=sample["barcode"])

            if sample["parent_barcode"]:
                sq_query &= Q(sample__container__location__barcode=sample["parent_barcode"])

            if sample["coordinates"]:
                sq_query &= Q(sample__coordinate__name=sample["coordinates"])

            if sample["old_alias"]:
                sq_query &= Q(derived_sample__biosample__alias=sample["old_alias"])
            if sample["old_name"]:
                sq_query &= Q(sample__name=sample["old_name"])

            dbs = DerivedBySample.objects.get(sq_query)

            if sample["new_alias"]:
                dbs.derived_sample.biosample.alias = sample["new_alias"]
                dbs.derived_sample.biosample.save()
            if sample["new_name"]:
                dbs.sample.name = sample["new_name"]
                dbs.sample.save()

        except DerivedBySample.DoesNotExist:
            self.errors["rename"].append(f"No sample found with the criteria provided; please refine your criteria.")
        except DerivedBySample.MultipleObjectsReturned:
            count = DerivedBySample.objects.filter(sq_query).count()
            self.errors["rename"].append(f"{count} samples found with the provided criteria to rename; please refine your criteria.")

        if not self.has_errors():
            self.row_object = {
                "Sample Name": dbs.sample.name if dbs else None,
                "Sample Alias": dbs.derived_sample.biosample.alias if dbs else None,
                "Container Barcode": dbs.sample.container.barcode if dbs else None,
                "Parent Container Barcode": dbs.sample.container.location.barcode if dbs and dbs.sample.container.location else None,
                "Container Coordinate": dbs.sample.coordinate.name if dbs else None,
                "Index Name": dbs.derived_sample.library.index.name if dbs and dbs.derived_sample.library else None,
            }
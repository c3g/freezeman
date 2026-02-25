from typing import TypedDict

from fms_core.models import DerivedBySample
from fms_core.services.sample import rename_sample
from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.utils import get_derived_by_sample_querynode

from django.db.models import Q

class SampleRenameRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, sample: "SampleRenameKwargs"):
        q = get_derived_by_sample_querynode(
            index=sample['index'],
            barcode=sample['barcode'],
            coordinates=sample['coordinates'],
            alias=sample['old_alias'],
            name=sample['old_name'],
        )
        try:
            derived_by_sample = DerivedBySample.objects.get(q)
            derived_by_sample, self.errors["rename"], self.warnings["rename"] = rename_sample(
                derived_by_sample=derived_by_sample,
                new_name=sample['new_name'],
                new_alias=sample['new_alias'],
            )

        except DerivedBySample.DoesNotExist:
            self.errors["rename"] = ["No sample found with the criteria provided; please refine your criteria."]
        except DerivedBySample.MultipleObjectsReturned:
            count = DerivedBySample.objects.filter(q).values_list('sample_id', flat=True).distinct().count()
            if count == 1:
                self.errors["rename"] = [f"Sample found with the provided criteria is a pool and will not be renamed."]
            else:
                self.errors["rename"] = [f"{count} samples found with the provided criteria to rename; please refine your criteria."]

        if not self.has_errors():
            self.row_object = {
                "Sample Name": derived_by_sample.sample.name if derived_by_sample else None,
                "Sample Alias": derived_by_sample.derived_sample.biosample.alias if derived_by_sample else None,
                "Container Barcode": derived_by_sample.sample.container.barcode if derived_by_sample else None,
                "Container Coordinate": derived_by_sample.sample.coordinate.name if derived_by_sample and derived_by_sample.sample.coordinate else None,
                "Index Name": derived_by_sample.derived_sample.library.index.name if derived_by_sample and derived_by_sample.derived_sample.library else None,
            }
            

class SampleRenameKwargs(TypedDict):
    barcode: str | None
    coordinates: str | None
    index: str | None
    old_alias: str | None
    old_name: str | None
    new_alias: str | None
    new_name: str | None
from typing import Set, TypedDict

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import rename_sample

from django.db.models import Q

class SampleRenameKwargs(TypedDict):
    barcode: str | None
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
        derived_by_sample, self.errors["rename"], self.warnings["rename"] = rename_sample(**sample)

        if not self.has_errors():
            self.row_object = {
                "Sample Name": derived_by_sample.sample.name if derived_by_sample else None,
                "Sample Alias": derived_by_sample.derived_sample.biosample.alias if derived_by_sample else None,
                "Container Barcode": derived_by_sample.sample.container.barcode if derived_by_sample else None,
                "Container Coordinate": derived_by_sample.sample.coordinate.name if derived_by_sample and derived_by_sample.sample.coordinate else None,
                "Index Name": derived_by_sample.derived_sample.library.index.name if derived_by_sample and derived_by_sample.derived_sample.library else None,
            }
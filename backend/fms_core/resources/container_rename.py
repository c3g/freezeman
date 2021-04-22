import reversion

from django.db.models import Q
from import_export.fields import Field

from ._generic import GenericResource
from ._utils import get_container_pk, skip_rows
from ..models import Container
from ..utils import get_normalized_str, blank_str_to_none
from ..models._constants import TEMPORARY_RENAME_SUFFIX

__all__ = ["ContainerRenameResource"]


class ContainerRenameResource(GenericResource):
    id = Field(attribute="id")
    barcode = Field(attribute="barcode", column_name="New Container Barcode")
    name = Field(attribute="name", column_name="New Container Name")
    update_comment = Field(attribute="update_comment", column_name="Update Comment")


    class Meta:
        model = Container
        import_id_fields = ("id",)
        fields = (
            "barcode",
            "name",
            "update_comment",
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)  # Skip preamble and normalize dataset

        old_barcodes_set = set()
        id_col = []

        for d in dataset.dict:
            old_barcode = get_normalized_str(d, "Old Container Barcode")
            if old_barcode in old_barcodes_set:
                raise ValueError(f"Cannot rename container with barcode {old_barcode} more than once")

            old_barcodes_set.add(old_barcode)
            id_col.append(get_container_pk(barcode=old_barcode))

        dataset.append_col(id_col, header="id")

    def import_obj(self, obj, data, dry_run):
        errors = {}

        if not obj.id:
            self.manuallyExclude.extend(["kind", "name"]) 

        try:
            super().import_obj(obj, data, dry_run)
        except ValidationError as e:
            errors = e.update_error_dict(errors).copy()

        if errors:
            raise ValidationError(errors)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == "barcode":
            new_barcode = blank_str_to_none(get_normalized_str(data, "New Container Barcode"))
            if new_barcode:
                obj.barcode = new_barcode
            else:
                return # Only set new container barcode if a new one is specified

        if field.attribute == "name":
            new_name = blank_str_to_none(get_normalized_str(data, "New Container Name"))
            if new_name:
                obj.name = new_name
            else:
                return # Only set new container name if a new one is specified
        
        if field.attribute == "update_comment":
            obj.update_comment = get_normalized_str(data, "Update Comment")
            return

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, *args, **kwargs):
        super().after_save_instance(*args, **kwargs)
        reversion.set_comment("Renamed containers from template.")
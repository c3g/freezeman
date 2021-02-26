import reversion

from django.db.models import Q
from import_export.fields import Field

from ._generic import GenericResource
from ._utils import get_container_pk, skip_rows
from ..models import Container
from ..utils import get_normalized_str
from ..models._constants import TEMPORARY_RENAME_SUFFIX

__all__ = ["ContainerRenameResource"]


class ContainerRenameResource(GenericResource):
    id = Field(attribute="id")
    barcode = Field(attribute="barcode")  # Computed barcode field for updating
    name = Field(attribute="name", column_name="New Container Name")
    update_comment = Field(attribute="update_comment", column_name="Update Comment")

    def __init__(self):
        super().__init__()
        self.new_barcode_old_barcode_map = {}
        self.new_barcode_old_name_map = {}

    class Meta:
        model = Container
        import_id_fields = ("id",)
        fields = (
            "barcode",
            "name",
            "update_comment",
        )

        use_bulk = True
        batch_size = None

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
        old_container_barcode = get_normalized_str(data, "Old Container Barcode")
        new_container_barcode = get_normalized_str(data, "New Container Barcode")
        new_container_name = get_normalized_str(data, "New Container Name")

        self.new_barcode_old_barcode_map[new_container_barcode] = old_container_barcode
        self.new_barcode_old_name_map[new_container_barcode] = \
            Container.objects.get(barcode=old_container_barcode).name

        # Only set new container name if a new one is specified
        data["New Container Name"] = new_container_name or obj.name
        super().import_obj(obj, data, dry_run)

        # Set the new barcode value
        obj.barcode = new_container_barcode

        # Do some basic validation manually, since bulk_update won't help us out here
        #  - The validators will not be called automatically since we're not running
        #    full_clean, so pass a special kwarg into our clean() implementation to
        #    manually check that the barcodes and names are good without checking for
        #    uniqueness the way full_clean() does.
        obj.normalize()
        obj.clean(check_regexes=True)

        if not dry_run:
            # Append a zero-width space to the barcode / name to avoid triggering integrity errors.
            # These will be removed after the initial import succeeds.
            obj.barcode = obj.barcode + TEMPORARY_RENAME_SUFFIX
            obj.name = obj.name + TEMPORARY_RENAME_SUFFIX

    def after_save_instance(self, *args, **kwargs):
        super().after_save_instance(*args, **kwargs)
        reversion.set_comment("Renamed containers from template.")

    def after_import(self, dataset, result, using_transactions, dry_run, **kwargs):
        if not dry_run:
            # Remove the zero-width spaces introduced before, ideally without errors.
            # If there are integrity errors, django-import-export will revert to the save-point.
            for container in Container.objects.filter(
                    Q(barcode__endswith=TEMPORARY_RENAME_SUFFIX) | Q(name__endswith=TEMPORARY_RENAME_SUFFIX)):
                container.barcode = container.barcode.replace(TEMPORARY_RENAME_SUFFIX, "")
                container.name = container.name.replace(TEMPORARY_RENAME_SUFFIX, "")
                container.save()  # Will also run normalize and full_clean

        return super().after_import(dataset, result, using_transactions, dry_run, **kwargs)

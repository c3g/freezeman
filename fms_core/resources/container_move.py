import reversion

from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget

from ._generic import GenericResource
from ._utils import skip_rows
from ..models import Container
from ..utils import get_normalized_str


class ContainerMoveResource(GenericResource):
    barcode = Field(attribute="barcode", column_name="Container Barcode to move")
    # fields that can be updated on container move
    location = Field(attribute="location", column_name="Dest. Location Barcode",
                     widget=ForeignKeyWidget(Container, field="barcode"))
    coordinates = Field(attribute="coordinates", column_name="Dest. Location Coord")
    update_comment = Field(attribute="update_comment", column_name="Update Comment")

    class Meta:
        model = Container
        import_id_fields = ("barcode",)
        fields = (
            "location",
            "coordinates",
            "update_comment",
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)  # Skip preamble and normalize dataset

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == "location":
            data["Dest. Location Barcode"] = get_normalized_str(data, "Dest. Location Barcode")

        if field.attribute == "coordinates":
            data["Dest. Location Coord"] = get_normalized_str(data, "Dest. Location Coord")

        if field.attribute == "update_comment":
            data["Update Comment"] = get_normalized_str(data, "Update Comment")

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, *args, **kwargs):
        super().after_save_instance(*args, **kwargs)
        reversion.set_comment("Moved containers from template.")

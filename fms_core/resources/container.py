import reversion
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget
from ._generic import GenericResource
from ._utils import skip_rows
from ..models import Container
from ..utils import get_normalized_str


__all__ = ["ContainerResource"]


class ContainerResource(GenericResource):
    kind = Field(attribute='kind', column_name='Container Kind')
    name = Field(attribute='name', column_name='Container Name')
    barcode = Field(attribute='barcode', column_name='Container Barcode')
    location = Field(attribute='location', column_name='Location Barcode',
                     widget=ForeignKeyWidget(Container, 'barcode'))
    coordinates = Field(attribute='coordinates', column_name='Location Coordinate')
    comment = Field(attribute='comment', column_name='Comment')

    class Meta:
        model = Container
        import_id_fields = ('barcode',)
        fields = ('kind', 'name', 'barcode', 'location', 'coordinates',)

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == "kind":
            # Normalize kind attribute to be lowercase
            data["Container Kind"] = get_normalized_str(data, "Container Kind").lower()
        elif field.attribute == "coordinates":
            # Normalize None coordinates to empty strings
            data["Location Coordinate"] = get_normalized_str(data, "Location Coordinate").upper()
        elif field.attribute == "comment":
            # Normalize None comments to empty strings
            data["Comment"] = get_normalized_str(data, "Comment")
        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported containers from template.")

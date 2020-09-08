import reversion

from decimal import Decimal
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget
from ._generic import GenericResource
from ._utils import skip_rows
from ..models import Container, Sample
from ..utils import (
    VolumeHistoryUpdateType,
    blank_str_to_none,
    check_truth_like,
    create_volume_history,
    float_to_decimal,
    get_normalized_str,
)


class SampleUpdateResource(GenericResource):
    # fields to retrieve a sample
    id = Field(attribute='id', column_name='id')
    container = Field(attribute='container', column_name='Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))
    coordinates = Field(attribute='coordinates', column_name='Coord (if plate)')
    # fields that can be updated on sample update
    # delta volume
    volume_history = Field(attribute='volume_history', column_name='Delta Volume (uL)')
    # new concentration
    concentration = Field(attribute='concentration', column_name='New Conc. (ng/uL)')
    depleted = Field(attribute="depleted", column_name="Depleted")
    update_comment = Field(attribute="update_comment", column_name="Update Comment")

    class Meta:
        model = Sample
        import_id_fields = ('id',)
        fields = (
            'volume_history',
            'concentration',
            'depleted',
            'update_comment',
        )
        exclude = ('container', 'coordinates')

    @staticmethod
    def _get_sample_pk(**query):
        try:
            return Sample.objects.get(**query).pk
        except Sample.DoesNotExist:
            raise Sample.DoesNotExist(f"Sample matching query {query} does not exist")

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)  # Skip preamble

        # add column 'id' with pk
        dataset.append_col([
            SampleUpdateResource._get_sample_pk(
                container__barcode=get_normalized_str(d, "Container Barcode"),
                coordinates=get_normalized_str(d, "Coord (if plate)"),
            ) for d in dataset.dict
        ], header="id")

        super().before_import(dataset, using_transactions, dry_run, **kwargs)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == "concentration":
            conc = blank_str_to_none(data.get("New Conc. (ng/uL)"))  # "" -> None for CSVs
            if conc is None:
                return
            data["New Conc. (ng/uL)"] = float_to_decimal(conc)

        if field.attribute == "volume_history":
            # Manually process volume history and don't call superclass method
            delta_vol = blank_str_to_none(data.get("Delta Volume (uL)"))  # "" -> None for CSVs
            if delta_vol is not None:  # Only update volume if we got a value
                # Note: Volume history should never be None, but this prevents
                #       a bunch of cascading tracebacks if the synthetic "id"
                #       column created above throws a DoesNotExist error.
                if not obj.volume_history:
                    obj.volume_history = []
                vol = obj.volume + Decimal(delta_vol)
                obj.volume_history.append(create_volume_history(
                    VolumeHistoryUpdateType.UPDATE,
                    str(float_to_decimal(vol))
                ))
            return

        if field.attribute == 'depleted':
            depleted = blank_str_to_none(data.get("Depleted"))  # "" -> None for CSVs
            if depleted is None:
                return

            if isinstance(depleted, str):  # Strip string values to ensure empty strings get caught
                depleted = depleted.strip()

            # Normalize boolean attribute then proceed normally (only if some value is specified)
            data["Depleted"] = check_truth_like(str(depleted or ""))

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Updated samples from template.")

import reversion

import re
import ast
from django.utils import timezone
from decimal import Decimal
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget
from ._generic import GenericResource
from ._utils import skip_rows, add_column_to_preview
from ..models import Container, Sample, Protocol, Process, ProcessSample
from ..utils import (
    blank_str_to_none,
    check_truth_like,
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
    # volume
    volume = Field(attribute='new_volume', column_name='New Volume (uL)')
    volume_delta = Field(column_name='Delta Volume (uL)')
    # new concentration
    concentration = Field(attribute='concentration', column_name='New Conc. (ng/uL)')
    depleted = Field(attribute="depleted", column_name="Depleted")
    update_comment = Field(attribute="update_comment", column_name="Update Comment")

    class Meta:
        model = Sample
        import_id_fields = ('id',)
        fields = (
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


    def import_obj(self, obj, data, dry_run):
        self.process = Process.objects.create(protocol=Protocol.objects.get(name="Update"),
                                              comment="Updated samples (imported from template)")

        self.volume_used = None
        super().import_obj(obj, data, dry_run)


    def before_import_row(self, row, **kwargs):
        # Ensure that new volume and delta volume do not have both a value for the same row.
        vol = blank_str_to_none(row.get("New Volume (uL)"))
        delta_vol = blank_str_to_none(row.get("Delta Volume (uL)"))
        if vol and delta_vol:
            raise Exception("You cannot submit both a New Volume and a Delta Volume for a single sample update.")

        super().before_import_row(row, **kwargs)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == "concentration":
            conc = blank_str_to_none(data.get("New Conc. (ng/uL)"))  # "" -> None for CSVs
            if conc is None:
                return
            data["New Conc. (ng/uL)"] = float_to_decimal(conc)

        if field.attribute == "new_volume":
            # Manually process volume history and don't call superclass method
            new_vol = blank_str_to_none(data.get("New Volume (uL)"))  # "" -> None for CSVs
            if new_vol is not None:  # Only update volume if we got a value
                previous_vol= obj.volume
                self.volume_used = float_to_decimal(float(previous_vol) - float(new_vol))
                obj.volume = new_vol
            return

        if field.column_name == "Delta Volume (uL)":
            # Manually process volume history and don't call superclass method
            delta_vol = blank_str_to_none(data.get("Delta Volume (uL)"))  # "" -> None for CSVs
            if delta_vol is not None:  # Only update volume if we got a value
                # Note: Volume history should never be None, but this prevents
                #       a bunch of cascading tracebacks if the synthetic "id"
                #       column created above throws a DoesNotExist error.
                obj.volume = obj.volume + Decimal(delta_vol)
                self.volume_used = Decimal(delta_vol)
            return

        if field.attribute == 'depleted':
            depleted = blank_str_to_none(data.get("Depleted"))  # "" -> None for CSVs
            if depleted is None:
                return

            if isinstance(depleted, str):  # Strip string values to ensure empty strings get caught
                depleted = depleted.strip()

            # Normalize boolean attribute then proceed normally (only if some value is specified)
            data["Depleted"] = check_truth_like(str(depleted or ""))

        if field.attribute == "update_comment":
            obj.update_comment = blank_str_to_none(data.get("Update Comment"))
            self.update_comment = obj.update_comment

        super().import_field(field, obj, data, is_m2m)

    def before_save_instance(self, instance, using_transactions, dry_run):
        self.process_sample = ProcessSample.objects.create(process=self.process,
                                                           source_sample=instance,
                                                           execution_date=timezone.now(),
                                                           volume_used=self.volume_used,
                                                           comment=self.update_comment)

        super().before_save_instance(instance, using_transactions, dry_run)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Updated samples from template.")

    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False,
                    **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)
        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        if dry_run and not len(results.invalid_rows) > 0:
            results = add_column_to_preview(results, dataset, "Delta Volume (uL)")
            index_volume = results.diff_headers.index("New Volume (uL)")
            for row in results.rows:
                if row.diff:
                    list_vol = row.diff[index_volume]
                    # Case where the volume is changed and a volume difference is present
                    match = re.search(r".*<ins .*>, (.*)</ins>.*", list_vol)
                    if match:
                        latest_vol = ast.literal_eval(match.group(1))
                        row.diff[index_volume] = str(latest_vol["volume_value"])
                    else:
                        # Case where the volume is not changed and we extract the latest volume
                        match = re.search(r".*<span.*>(.*)</span>.*", list_vol)
                        if match:
                            latest_vol = ast.literal_eval(match.group(1))[-1]
                            row.diff[index_volume] = str(latest_vol["volume_value"])
        return results

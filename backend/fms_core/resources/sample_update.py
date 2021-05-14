import reversion

import re
import ast
from django.utils import timezone
from decimal import Decimal
from import_export.fields import Field
from import_export.widgets import DateWidget, ForeignKeyWidget
from django.core.exceptions import ValidationError
from ._generic import GenericResource
from ._utils import skip_rows, add_columns_to_preview
from ..models import Container, Sample, Protocol, Process, ProcessSample
from ..utils import (
    blank_str_to_none,
    check_truth_like,
    float_to_decimal,
    get_normalized_str,
    str_cast_and_normalize,
)


class SampleUpdateResource(GenericResource):
    # fields to retrieve a sample
    id = Field(attribute='id', column_name='id')
    container = Field(attribute='container', column_name='Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))
    coordinates = Field(attribute='coordinates', column_name='Coord (if plate)')
    # fields that can be updated on sample update
    # volume
    volume = Field(attribute='volume', column_name='New Volume (uL)')
    volume_delta = Field(column_name='Delta Volume (uL)')
    # new concentration
    concentration = Field(attribute='concentration', column_name='New Conc. (ng/uL)')
    depleted = Field(attribute="depleted", column_name="Depleted")
    update_date = Field(column_name="Update Date", widget=DateWidget())
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

    def __init__(self):
        super().__init__()
        self.process = None

    @staticmethod
    def _get_sample_pk(**query):
        try:
            return Sample.objects.get(**query).pk
        except Sample.DoesNotExist:
            raise Exception(f"Sample matching query {query} does not exist.")

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
        errors = {}
        
        previous_vol = obj.volume

        try:
            super().import_obj(obj, data, dry_run) 
        except ValidationError as e:
            errors = e.update_error_dict(errors).copy()

        self.volume_used = float_to_decimal(float(previous_vol) - float(obj.volume)) if previous_vol != obj.volume else None

        try:
            if not self.process:
                self.process = Process.objects.create(protocol=Protocol.objects.get(name="Update"),
                                                      comment="Updated samples (imported from template)")

            self.process_sample = ProcessSample.objects.create(process=self.process,
                                                               source_sample=obj,
                                                               volume_used=self.volume_used,
                                                               execution_date=self.update_date,
                                                               comment=self.update_comment)
        except Exception as e:
            errors["process"] = ValidationError([f"Cannot create process. Fix other errors to resolve this."], code="invalid")

        if errors:
            raise ValidationError(errors)


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

        if field.attribute == "volume":
            # Manually process volume history and don't call superclass method
            new_vol = blank_str_to_none(data.get("New Volume (uL)"))  # "" -> None for CSVs
            if new_vol is not None:  # Only update volume if we got a value
                obj.volume = new_vol
            return

        if field.column_name == "Delta Volume (uL)":
            # Manually process volume history and don't call superclass method
            delta_vol = blank_str_to_none(data.get("Delta Volume (uL)"))  # "" -> None for CSVs
            if delta_vol is not None:  # Only update volume if we got a value
                obj.volume = obj.volume + Decimal(delta_vol)
            return

        if field.attribute == 'depleted':
            depleted = blank_str_to_none(str_cast_and_normalize(data.get("Depleted")))  # "" -> None for CSVs
            if depleted is None:
                return

            # Normalize boolean attribute then proceed normally (only if some value is specified)
            data["Depleted"] = check_truth_like(str(depleted or ""))

        if field.column_name == "Update Date":
            self.update_date = blank_str_to_none(data.get("Update Date"))
            return

        if field.attribute == "update_comment":
            obj.update_comment = blank_str_to_none(data.get("Update Comment"))
            self.update_comment = obj.update_comment

        try:
            super().import_field(field, obj, data, is_m2m)
        except Exception as e:
            raise ValidationError(e)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Updated samples from template.")

    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False,
                    **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)
        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        if dry_run and not len(results.invalid_rows) > 0:
            results = add_columns_to_preview(results, dataset, ["Delta Volume (uL)", "Update Date"])
        return results

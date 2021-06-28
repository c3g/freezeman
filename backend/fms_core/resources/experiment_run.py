import reversion
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget, DateWidget
from ._generic import GenericResource
from ._utils import skip_rows, add_columns_to_preview
from ..models import ExperimentRun, Container, Instrument, ExperimentType
from ..utils import get_normalized_str
from django.core.exceptions import ValidationError
from datetime import datetime


__all__ = ["ExperimentRunResource"]


class ExperimentRunResource(GenericResource):
    container_barcode = Field(column_name='Experiment Container Barcode',
                              widget=ForeignKeyWidget(Container, field='barcode'))
    container_kind = Field(column_name='Experiment Container Kind')
    instrument_name = Field(column_name='Instrument Name',
                              widget=ForeignKeyWidget(Instrument, field='name'))
    start_date = Field(attribute='start_date', column_name='Experiment Start Date', widget=DateWidget())

    class Meta:
        model = ExperimentRun
        import_id_fields = ()
        fields = (
        )
        excluded = (
            'container',
            'instrument'
        )


    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        self.experiment_type_name = dataset[1][2]
        skip_rows(dataset, 10)  # Skip preamble


    def import_obj(self, obj, data, dry_run):
        errors = {}

        try:
            super().import_obj(obj, data, dry_run)
        except ValidationError as e:
            errors = e.update_error_dict(errors).copy()

        # Getting experiment_type
        try:
            obj.experiment_type = ExperimentType.objects.get(workflow=self.experiment_type_name)
        except Exception as e:
            errors["experiment_type"] = ValidationError([f"No experiment type with workflow {self.experiment_type_name} could be found."], code="invalid")

        # Getting container
        barcode = get_normalized_str(data, "Experiment Container Barcode")
        kind = get_normalized_str(data, "Experiment Container Kind")

        if barcode and kind:
            try:
                obj.container, container_created = Container.objects.get_or_create(
                    barcode=barcode,
                    kind=kind,
                    defaults={'comment': f"Automatically generated via experiment run template import on "
                            f"{datetime.utcnow().isoformat()}Z",
                              'name': get_normalized_str(data, "Experiment Container Barcode")},
                )
            except Exception as e:
                errors["container"] = ValidationError([f"Could not create experiment container. Barcode and kind are existing and do not match. "], code="invalid")

        # Getting instrument
        instrument_name = get_normalized_str(data, "Instrument Name")
        if instrument_name:
            try:
                obj.instrument = Instrument.objects.get(name=instrument_name)
            except Exception as e:
                errors["instrument"] = ValidationError([f"No instrument named {instrument_name} could be found."], code="invalid")

        if errors:
            raise ValidationError(errors)


    def import_field(self, field, obj, data, is_m2m=False):
        super().import_field(field, obj, data, is_m2m)


    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False,
                    **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)
        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        if dry_run and not len(results.invalid_rows) > 0:
            COLUMNS_TO_ADD = ['Experiment Container Barcode', 'Experiment Container Kind', 'Instrument Name']
            results = add_columns_to_preview(results, dataset, COLUMNS_TO_ADD)
        return results
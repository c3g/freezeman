import reversion
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget, DateWidget
from ._generic import GenericResource
from ._utils import skip_rows
from ..models import ExperimentRun, Container, Instrument, ExperimentType
from ..utils import get_normalized_str
from django.core.exceptions import ValidationError
from datetime import datetime


__all__ = ["ExperimentRunResource"]


class ExperimentRunResource(GenericResource):
    container_barcode = Field(column_name='Experiment Container Barcode')
    container_kind = Field(column_name='Experiment Container Kind')
    instrument_name = Field(column_name='Instrument Name')
    start_date = Field(attribute='start_date', column_name='Experiment Start Date', widget=DateWidget())

    class Meta:
        model = ExperimentRun
        import_id_fields = ()
        fields = (
            'start_date'
        )
        excluded = (
            'experiment_type',
            'container',
            'instrument'
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        self.experiment_type_name = dataset[1][2]
        skip_rows(dataset, 10)  # Skip preamble


    def import_obj(self, obj, data, dry_run):
        errors = {}

        # Getting experiment_type
        try:
            obj.experiment_type = ExperimentType.objects.get(workflow=self.experiment_type_name)
        except ExperimentType.DoesNotExist:
            errors["experiment_type"] = ValidationError([f"No experiment type with workflow {self.experiment_type_name} could be found."], code="invalid")


        # Getting container
        container_info =  dict(
            barcode=get_normalized_str(data, "Experiment Container Barcode"),
            kind=get_normalized_str(data, "Experiment Container Kind"),
        )
        try:
            obj.container, container_created = Container.objects.get_or_create(
                **container_info,
                defaults={'comment': f"Automatically generated via experiment run template import on "
                        f"{datetime.utcnow().isoformat()}Z"},
            )
        except Container.DoesNotExist:
            errors["container"] = ValidationError([f"Could not create experiment container. Barcode and kind are existing and do not match. "], code="invalid")

        # Getting instrument
        instrument_name = get_normalized_str(data, "Instrument Name")
        try:
            obj.instrument = Instrument.objects.get(name=instrument_name)
        except Instrument.DoesNotExist:
            errors["instrument"] = ValidationError([f"No instrument named {instrument_name} could be found."], code="invalid")


        if errors:
            raise ValidationError(errors)

    def import_field(self, field, obj, data, is_m2m=False):
        super().import_field(field, obj, data, is_m2m)
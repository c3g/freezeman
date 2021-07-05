from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
import reversion
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget, DateWidget
from datetime import datetime
from itertools import accumulate, islice

from ..models import (
    ExperimentRun,
    Container,
    Instrument,
    ExperimentType,
    Protocol,
    Process,
    PropertyType,
    PropertyValue
)
from ._generic import GenericResource

from ._utils import skip_rows, add_columns_to_preview
from ..utils import get_normalized_str

from ..experiments import PROTOCOLS_BY_EXPERIMENT_TYPE_NAME

__all__ = ["ExperimentRunResource"]


process_content_type = ContentType.objects.get(app_label="fms_core", model="process")


class ExperimentRunResource(GenericResource):
    container_barcode = Field(column_name='Experiment Container Barcode',
                              widget=ForeignKeyWidget(Container, field='barcode'))
    container_kind = Field(column_name='Experiment Container Kind')
    instrument_name = Field(column_name='Instrument Name',
                              widget=ForeignKeyWidget(Instrument, field='name'))
    start_date = Field(attribute='start_date', column_name='Experiment Start Date', widget=DateWidget())


    ERROR_CUTOFF = 500


    class Meta:
        model = ExperimentRun
        import_id_fields = ()
        fields = (
        )
        excluded = (
            'container',
            'instrument',
            'process',
        )


    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        self.experiment_type_name = dataset[1][2]

        # at index 6 is the first process name
        self.protocols_starting_idx = 6

        self.properties_row = list(filter(None, dataset[9][self.protocols_starting_idx:]))

        self.protocols_ending_idx = self.protocols_starting_idx + len(self.properties_row)


        # Preload PropertyType objects for this experiment type in a dictionary for faster access
        self.property_types_by_name = {}
        for property_column in self.properties_row:
            self.property_types_by_name[property_column] = PropertyType.objects.get(name=property_column)

        # Preload Protocols objects for this  experiment type in a dictionary for faster access
        self.protocols_dict = {}
        protocols_for_experiment_type = PROTOCOLS_BY_EXPERIMENT_TYPE_NAME[self.experiment_type_name]
        for protocol_name in protocols_for_experiment_type.keys():
            p = Protocol.objects.get(name=protocol_name)
            subprotocol_names = protocols_for_experiment_type[protocol_name]
            self.protocols_dict[p] = map(lambda x: Protocol.objects.get(name=x), subprotocol_names)


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


        experiment_run_processes_by_protocol_id = {}
        # Create processes for ExperimentRun
        for protocol in self.protocols_dict.keys():
            obj.process = Process.objects.create(protocol=protocol,
                                                    comment="Experiment (imported from template)")
            for subprotocol in self.protocols_dict[protocol]:
                sp = Process.objects.create(protocol=subprotocol,
                                            parent_process=obj.process,
                                            comment="Experiment (imported from template)")
                experiment_run_processes_by_protocol_id[subprotocol.id] = sp


        # Create property values for ExperimentRun
        for i, (property, value) in enumerate(data.items()):
            # Slicing columns not containing properties
            if i < self.protocols_starting_idx or i >= self.protocols_ending_idx:
                pass
            else:
                property_type = self.property_types_by_name[property]
                if value:
                    process = experiment_run_processes_by_protocol_id[property_type.object_id]
                    PropertyValue.objects.create(value=value,
                                                 property_type=property_type,
                                                 content_type=process_content_type,
                                                 object_id=process.id)
                # Comments are the only non-mandatory fields
                elif 'comment' not in property.lower():
                    errors[property] = ValidationError([f"Value cannot be blank"],
                                                           code="invalid")


        if errors:
            raise ValidationError(errors)


    def import_field(self, field, obj, data, is_m2m=False):
        super().import_field(field, obj, data, is_m2m)


    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False,
                    **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)
        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        if dry_run and not len(results.invalid_rows) > 0:
            COLUMNS_TO_ADD = ['Experiment Container Barcode',
                              'Experiment Container Kind',
                              'Instrument Name']\
                             + self.properties_row

            results = add_columns_to_preview(results, dataset, COLUMNS_TO_ADD)
        return results
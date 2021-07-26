from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
import reversion
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget, DateWidget
from datetime import datetime
from itertools import accumulate, islice
import traceback
import json

from ..models import (
    ExperimentRun,
    Container,
    Instrument,
    ExperimentType,
    Protocol,
    Process,
    ProcessMeasurement,
    PropertyType,
    PropertyValue,
    Sample,
    SampleLineage
)
from ._generic import GenericResource

from ._utils import skip_rows, add_columns_to_preview, wipe_import_row_result
from ..utils import (
    blank_str_to_none,
    float_to_decimal,
    get_normalized_str,
)

from ..experiments import PROTOCOLS_BY_EXPERIMENT_TYPE_NAME

__all__ = ["ExperimentRunResource"]


class ExperimentRunResource(GenericResource):
    experiment_id = Field(column_name='Experiment ID')
    container_barcode = Field(column_name='Experiment Container Barcode',
                              widget=ForeignKeyWidget(Container, field='barcode'))
    container_kind = Field(column_name='Experiment Container Kind')
    instrument_name = Field(column_name='Instrument Name',
                            widget=ForeignKeyWidget(Instrument, field='name'))
    start_date = Field(attribute='start_date', column_name='Experiment Start Date', widget=DateWidget())


    # Arbitrary value much higher than the regular error cutoff
    ERROR_CUTOFF = 500

    process_content_type = ContentType.objects.get_for_model(Process)


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
        self.sample_rows = []
        self.experiments = {}
        self.temporary_experiment_id = None

        self.experiment_type_name = dataset[1][2]

        self.is_in_samples_section = False

        # at index 6 is the first process name
        self.protocols_starting_idx = 6

        self.properties_row = list(filter(None, dataset[9][self.protocols_starting_idx:]))

        self.protocols_ending_idx = self.protocols_starting_idx + len(self.properties_row)


        # Preload PropertyType objects for this experiment type in a dictionary for faster access
        self.property_types_by_name = {}
        for property_column in self.properties_row:
            self.property_types_by_name[property_column] = PropertyType.objects.get(name=property_column)

        # Preload Protocols objects for this experiment type in a dictionary for faster access
        self.protocols_dict = {}
        protocols_for_experiment_type = PROTOCOLS_BY_EXPERIMENT_TYPE_NAME[self.experiment_type_name]
        for protocol_name in protocols_for_experiment_type.keys():
            p = Protocol.objects.get(name=protocol_name)
            subprotocol_names = protocols_for_experiment_type[protocol_name]
            subprotocols = []
            for subprotocol_name in subprotocol_names:
               subprotocols.append(Protocol.objects.get(name=subprotocol_name))
            self.protocols_dict[p] = subprotocols.copy()


        skip_rows(dataset, 10)  # Skip preamble


    def import_row(self, row, instance_loader, using_transactions=True, dry_run=False, raise_errors=False, **kwargs):
        row_id = str(row.get("#", ""))
        self.temporary_experiment_id = row.get("Experiment ID", None)
        import_result = self.get_row_result_class()()
        if row_id.isnumeric() and self.temporary_experiment_id: # Uses row ID to identify what are the data rows (compared to title or empty rows)
            # We are in the Sample section
            # Columns from the Experiment section are mapped to the ones in the Sample section
            # This is hacky, and has to be replaced when we use a different tool for importing the data

            if self.is_in_samples_section:
                sample_row = {
                    "#": row_id,
                    "experiment_id": self.temporary_experiment_id,
                    "source_container_barcode": row.get("Experiment Container Barcode"),
                    "source_container_position": row.get("Experiment Container Kind"),
                    "source_sample_volume_used": float_to_decimal(blank_str_to_none(row.get("Instrument Name"))),
                    "experiment_container_position": row.get("Experiment Start Date"),
                }
                self.sample_rows.append(sample_row)

                import_result = wipe_import_row_result(import_result, row)
            else:
                import_result = super().import_row(row, instance_loader, using_transactions, dry_run, raise_errors, **kwargs)

        # If our row is not an ExperimentRun row...
        else:
            import_result = wipe_import_row_result(import_result, row)


        if row.get("Experiment Container Barcode") == "Source Container Barcode":
            self.is_in_samples_section = True


        return import_result


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
                obj.container, _ = Container.objects.get_or_create(
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

                    if type(value).__name__ in ('datetime','time'):
                        value = value.isoformat() + "Z"
                        value = json.dumps(value, default=str)

                    
                    PropertyValue.objects.create(value=value,
                                                 property_type=property_type,
                                                 content_object=process)
                    
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

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported ExperimentRun from template.")

        self.experiments.update({self.temporary_experiment_id: instance.id})


    def after_import(self, dataset, result, using_transactions, dry_run, **kwargs):
        super().after_import(dataset, result, using_transactions, dry_run, **kwargs)

        positions_by_experiment_temporary_id = {}

        for sample_row in self.sample_rows:
            data_experiment_id = sample_row["experiment_id"]
            data_barcode = sample_row["source_container_barcode"]
            data_coordinates = sample_row["source_container_position"]
            data_experiment_container_coordinates = sample_row["experiment_container_position"]

            source_container = None
            source_sample = None
            experiment_run = None

            sample_data_errors = []

            try:
                experiment_run = ExperimentRun.objects.get(id=self.experiments[data_experiment_id])
            except Exception as e:
                sample_data_errors.append(f"Experiment associated to temporary identifier {data_experiment_id} not found in this template")

            try:
                source_container = Container.objects.get(barcode=data_barcode)
            except Exception as e:
                sample_data_errors.append(f"Container with barcode {data_barcode} not found")

            if source_container:
                try:
                    source_sample = Sample.objects.get(container=source_container,
                                                       coordinates=data_coordinates)
                except Exception as e:
                    sample_data_errors.append(f"Sample from container {data_barcode} at coordinates {data_coordinates} not found")

            volume_used = float_to_decimal(blank_str_to_none(sample_row["source_sample_volume_used"]))
            if volume_used <= 0:
                sample_data_errors.append(f"Volume used ({volume_used}) is invalid ")
            elif source_sample and volume_used > source_sample.volume:
                sample_data_errors.append(f"Volume used ({volume_used}) exceeds the volume of the sample ({source_sample.volume})")


            # Checks that 2 samples are not put in the same experiment container position
            if data_experiment_id not in positions_by_experiment_temporary_id.keys():
                positions_by_experiment_temporary_id[data_experiment_id] = [data_experiment_container_coordinates]
            else:
                if data_experiment_container_coordinates in positions_by_experiment_temporary_id[data_experiment_id]:
                    sample_data_errors.append(
                        f"Coordinates {data_experiment_container_coordinates} already used for the container associated to the experiment named {data_experiment_id}")
                else:
                    positions_by_experiment_temporary_id[data_experiment_id].append(data_experiment_container_coordinates)


            # Creates the new objects
            if len(sample_data_errors) == 0:
                try:
                    source_sample.volume = source_sample.volume - volume_used
                    source_sample.save()

                    # Create experiment run sample
                    experiment_run_sample = Sample.objects.get(id=source_sample.id)
                    experiment_run_sample.pk = None
                    experiment_run_sample.container = experiment_run.container
                    experiment_run_sample.coordinates = data_experiment_container_coordinates
                    experiment_run_sample.volume = 0  # prevents this sample from being re-used or re-transferred afterwards
                    experiment_run_sample.depleted = True
                    experiment_run_sample.save()

                    # ProcessMeasurement for ExperimentRun on Sample
                    process_measurement = ProcessMeasurement.objects.create(process=experiment_run.process,
                                                                            source_sample=source_sample,
                                                                            volume_used=volume_used,
                                                                            execution_date=experiment_run.start_date)

                    SampleLineage.objects.create(process_measurement=process_measurement,
                                                 parent=source_sample,
                                                 child=experiment_run_sample)

                except Exception as e:
                    sample_data_errors.append(e)


            if len(sample_data_errors) > 0:
                sample_data_errors.insert(0, f"Row #{sample_row['#']}: ")
                error = ValidationError(
                    sample_data_errors, code="invalid")
                result.append_base_error(self.get_error_result_class()(error, ''))

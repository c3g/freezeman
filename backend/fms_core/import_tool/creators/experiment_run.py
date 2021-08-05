from django.core.exceptions import ValidationError
from datetime import datetime
from ...models import (
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

class ExperimentRunCreator():
    processes_by_protocol_id = {}

    def __init__(self, experiment_type, instrument, container, start_date,
                 samples, properties,
                 protocols_objs_dict, property_types_objs_dict):
        self.experiment_run = {'experiment_type': None,
                               'instrument': None,
                               'container': None,
                               'process': None,
                               'start_date': start_date}

        self.errors = {}

        self.pre_validation(start_date, container, samples)

        if(self.errors == {}):
            self.get_experiment_type(experiment_type)
            self.get_instrument(instrument)
            self.handle_container(container)
            self.create_processes(protocols_objs_dict)

            print(self.experiment_run)
            print(self.errors)

            if (self.errors == {}) and (None not in self.experiment_run.values()):
                try:
                    # Order is important; top process will be part of the ExperimentRun attr
                    ExperimentRun.objects.create(**self.experiment_run)
                    self.create_properties(properties, property_types_objs_dict)
                except Exception as e:
                    self.errors['experiment_run'] = e

    def pre_validation(self, start_date, container, samples):
        # Pre-verification
        if start_date is None or container['barcode'] is None:
            self.errors["experiment_run"] = ValidationError([f"Empty row or not enough information"], code="invalid")

        # if len(samples) <= 0:
        #     self.errors["samples"] = ValidationError([f"No samples were associated to this experiment"], code="invalid")

    def get_experiment_type(self, experiment_type):
        try:
            workflow = experiment_type['workflow']
            self.experiment_run['experiment_type'] = ExperimentType.objects.get(workflow=workflow)
        except Exception as e:
            self.errors["experiment_type"] = ValidationError(
                [f"No experiment type with workflow {workflow} could be found."], code="invalid")

    def get_instrument(self, instrument):
        instrument_name = instrument['name']
        if instrument_name:
            try:
                self.experiment_run['instrument'] = Instrument.objects.get(name=instrument_name)
            except Exception as e:
                self.errors["instrument"] = ValidationError([f"No instrument named {instrument_name} could be found."],
                                                       code="invalid")

    def handle_container(self, container):
        barcode = container['barcode']
        kind = container['kind']
        if barcode and kind:
            try:
                self.experiment_run['container'], _ = Container.objects.get_or_create(
                    barcode=barcode,
                    kind=kind,
                    defaults={'comment': f"Automatically generated via experiment run template import on "
                                         f"{datetime.utcnow().isoformat()}Z",
                              'name': barcode},
                )
            except Exception as e:
                self.errors["container"] = ValidationError(
                    [f"Could not create experiment container. Barcode and kind are existing and do not match. "],
                    code="invalid")


    def create_processes(self, protocols_objs_dict):
        # Create processes for ExperimentRun
        for protocol in protocols_objs_dict.keys():
            process = Process.objects.create(protocol=protocol,
                                                 comment="Experiment (imported from template)")
            self.experiment_run['process'] = process
            for subprotocol in protocols_objs_dict[protocol]:
                sp = Process.objects.create(protocol=subprotocol,
                                            parent_process=process,
                                            comment="Experiment (imported from template)")
                self.processes_by_protocol_id[subprotocol.id] = sp


    def create_properties(self, properties, property_types_objs_dict):
        # Create property values for ExperimentRun
        for i, (property, value) in enumerate(properties.items()):
            property_type = property_types_objs_dict[property]
            process = self.processes_by_protocol_id[property_type.object_id]

            if type(value).__name__ in ('datetime','time'):
                value = value.isoformat().replace("T00:00:00", "")

            try:
                PropertyValue.objects.create(value=value,
                                             property_type=property_type,
                                             content_object=process)
            except Exception as e:
                self.errors[property] = e.error_dict['value']
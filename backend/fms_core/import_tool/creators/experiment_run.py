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


def create_experiment_run(experiment_type, instrument, container, start_date, samples, properties):
    experiment_run = {'experiment_type': None,
                      'instrument': None,
                      'container': None,
                      'start_date': start_date}
    errors = {}


    # Pre-verification
    if start_date is None or container['barcode'] is None:
        errors["experiment_run"] = ValidationError([f"Empty row or not enough information"], code="invalid")

    # if len(samples) <= 0:
    #     errors["samples"] = ValidationError([f"No samples were associated to this experiment"], code="invalid")

    try:
        workflow = experiment_type['workflow']
        experiment_run['experiment_type'] = ExperimentType.objects.get(workflow=workflow)
    except Exception as e:
        errors["experiment_type"] = ValidationError([f"No experiment type with workflow {workflow} could be found."], code="invalid")

    barcode = container['barcode']
    kind = container['kind']
    if barcode and kind:
        try:
            experiment_run['container'], _ = Container.objects.get_or_create(
                barcode=barcode,
                kind=kind,
                defaults={'comment': f"Automatically generated via experiment run template import on "
                                     f"{datetime.utcnow().isoformat()}Z",
                          'name': barcode},
            )
        except Exception as e:
            errors["container"] = ValidationError(
                [f"Could not create experiment container. Barcode and kind are existing and do not match. "],
                code="invalid")

    # Getting instrument
    instrument_name = instrument['name']
    if instrument_name:
        try:
            experiment_run['instrument'] = Instrument.objects.get(name=instrument_name)
        except Exception as e:
            errors["instrument"] = ValidationError([f"No instrument named {instrument_name} could be found."],
                                                   code="invalid")

    print(experiment_run)
    print(errors)

    if (errors == {}) and (None not in experiment_run.values()):
        try:
            ExperimentRun.objects.create(**experiment_run)
        except Exception as e:
            errors['experiment_run'] = e
            import ipdb; ipdb.sset_trace();


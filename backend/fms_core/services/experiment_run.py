from datetime import datetime
from ..models import (
    ExperimentRun,
    Container,
    Instrument,
    ExperimentType,
    Process,
    ProcessMeasurement,
    PropertyValue,
    Sample,
    SampleLineage
)

def create_experiment_run(experiment_type, instrument, container, start_date,
                 samples, properties,
                 protocols_objs_dict, property_types_objs_dict):
    errors = {}
    experiment_run = {'experiment_type': None, 'instrument': None, 'container': None,
                      'process': None, 'start_date': start_date}

    # Get ExperimentType
    try:
        workflow = experiment_type['workflow']
        experiment_run['experiment_type'] = ExperimentType.objects.get(workflow=workflow)
    except Exception as e:
        errors["experiment_type"] = f"No experiment type with workflow {workflow} could be found."


    # Get Instrument
    instrument_name = instrument['name']
    if instrument_name:
        try:
            experiment_run['instrument'] = Instrument.objects.get(name=instrument_name)
        except Exception as e:
            errors["instrument"] = f"No instrument named {instrument_name} could be found."

    # Get or Create Container
    barcode = container['barcode']
    kind = container['kind']
    if barcode and kind:
        try:
            experiment_run['container'], _ = Container.objects.get_or_create(
                barcode=barcode,
                kind=kind,
                defaults={'comment': f"Automatically generated via experiment run creation on "
                                     f"{datetime.utcnow().isoformat()}Z",
                          'name': barcode},
            )
        except Exception as e:
            errors["container"] = f"Could not create experiment container. Barcode {barcode} and kind {kind} are existing and do not match."

    if (errors == {}):
        try:
            # Order is important; top process will be part of the ExperimentRun attr
            ExperimentRun.objects.create(**experiment_run)
            create_properties(properties, property_types_objs_dict)
        except Exception as e:
            errors['experiment_run'] = e

    process_ids = create_processes_from_protocols(protocols_objs_dict)
    create_properties(properties, property_types_objs_dict, process_ids)

def create_processes_from_protocols(protocols_objs_dict):
    process_ids_list = []
    for protocol in protocols_objs_dict.keys():
        parent_process = Process.objects.create(protocol=protocol, comment="")
        for subprotocol in protocols_objs_dict[protocol]:
            sp = Process.objects.create(protocol=subprotocol,
                                        parent_process=parent_process,
                                        comment="Experiment")
            process_ids_list.append(sp.id)

    return process_ids_list


def create_properties(properties, property_types_objs_dict, process_ids_list):
    errors = {}
    processes_by_protocol_id = Process.objects.in_bulk(process_ids_list, field_name="protocol_id")
    # Create property values for ExperimentRun
    for i, (property, value) in enumerate(properties.items()):
        property_type = property_types_objs_dict[property]
        protocol_id = property_type.object_id
        process = processes_by_protocol_id[protocol_id]

        if type(value).__name__ in ('datetime', 'time'):
            value = value.isoformat().replace("T00:00:00", "")

        try:
            PropertyValue.objects.create(value=str(value),
                                         property_type=property_type,
                                         content_object=process)
        except Exception as e:
            errors[property] = e.error_dict['value']


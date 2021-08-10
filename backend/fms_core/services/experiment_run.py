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
    experiment_run = None

    parent_process, processes_by_protocol_id = create_processes_from_protocols(protocols_objs_dict)

    try:
        # Order is important; top process will be part of the ExperimentRun attr
        experiment_run = ExperimentRun.objects.create(experiment_type=experiment_type,
                                     instrument=instrument,
                                     container=container,
                                     process=parent_process,
                                     start_date=start_date)
    except Exception as e:
        errors['experiment_run'] = e

    result = create_properties(properties, property_types_objs_dict, processes_by_protocol_id)
    if result['errors'] != {}:
        errors.append(result['errors'])

    return {'object': experiment_run, 'errors': errors}

def create_processes_from_protocols(protocols_objs_dict):
    processes_by_protocol_id = {}
    for protocol in protocols_objs_dict.keys():
        parent_process = Process.objects.create(protocol=protocol, comment="")
        for subprotocol in protocols_objs_dict[protocol]:
            sp = Process.objects.create(protocol=subprotocol,
                                        parent_process=parent_process,
                                        comment="Experiment")
            processes_by_protocol_id[subprotocol.id] = sp

    return (parent_process, processes_by_protocol_id)


def create_properties(properties, property_types_objs_dict, processes_by_protocol_id):
    errors = {}
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

    return {'errors': errors}


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

    parent_process, process_ids = create_processes_from_protocols(protocols_objs_dict)

    try:
        # Order is important; top process will be part of the ExperimentRun attr
        ExperimentRun.objects.create(experiment_type=experiment_type,
                                     instrument=instrument,
                                     container=container,
                                     process=parent_process,
                                     start_date=start_date)
    except Exception as e:
        errors['experiment_run'] = e

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

    return (parent_process, process_ids_list)


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


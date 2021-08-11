from datetime import datetime
from ..models import (
    ExperimentRun,
    Container,
    Process,
    ProcessMeasurement,
    PropertyValue,
    Sample,
    SampleLineage
)
from ..utils import (
    blank_str_to_none,
    float_to_decimal,
    get_normalized_str,
)

def create_experiment_run(experiment_type, instrument, container, start_date,
                 sample_rows_for_experiment, properties,
                 protocols_objs_dict, property_types_objs_dict):
    errors = {}
    experiment_run = None

    top_process, processes_by_protocol_id = create_processes_from_protocols(protocols_objs_dict)

    try:
        experiment_run = ExperimentRun.objects.create(experiment_type=experiment_type,
                                     instrument=instrument,
                                     container=container,
                                     process=top_process,
                                     start_date=start_date)

        print('SERVICES - experiment_run: ', experiment_run)

        result = create_properties(properties, property_types_objs_dict, processes_by_protocol_id)
        if result['errors'] != {}:
            errors['properties'] = result['errors']

        print('SERVICES - properties/result: ', result)

        result = get_and_associate_samples_to_experiment_run(experiment_run, sample_rows_for_experiment)
        if result['errors'] != {}:
            errors['samples'] = result['errors']

        print('SERVICES - samples/result: ', result)

    except Exception as e:
        errors['experiment_run'] = ';'.join(e.messages)
        print('SERVICES - experiment_run/exception: ', e)


    return {'object': experiment_run, 'errors': errors}

def create_processes_from_protocols(protocols_objs_dict):
    processes_by_protocol_id = {}
    for protocol in protocols_objs_dict.keys():
        top_process = Process.objects.create(protocol=protocol, comment="")
        for subprotocol in protocols_objs_dict[protocol]:
            sp = Process.objects.create(protocol=subprotocol,
                                        parent_process=top_process,
                                        comment="Experiment")
            processes_by_protocol_id[subprotocol.id] = sp

    return (top_process, processes_by_protocol_id)


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


def get_and_associate_samples_to_experiment_run(experiment_run, samples):
    errors = []
    for sample in samples:
        # TODO: handle sample_data_errors
        sample_data_errors = []

        data_row_id = sample['row_id']
        data_barcode = sample['container_barcode']
        data_coordinates = sample['container_coordinates']
        data_volume_used = sample['volume_used']
        data_experiment_container_coordinates = sample['experiment_container_coordinates']

        try:
            source_container = Container.objects.get(barcode=data_barcode)
        except Exception as e:
            sample_data_errors.append(f"Container with barcode {data_barcode} not found")

        volume_used = float_to_decimal(blank_str_to_none(data_volume_used))
        if volume_used <= 0:
            sample_data_errors.append(f"Volume used ({volume_used}) is invalid ")

        if source_container:
            sample_info = dict(
                container=source_container
            )
            if data_coordinates:
                sample_info['coordinates'] = data_coordinates
            try:
                source_sample = Sample.objects.get(**sample_info)

                if source_sample and volume_used > source_sample.volume:
                    sample_data_errors.append(
                        f"Volume used ({volume_used}) exceeds the volume of the sample ({source_sample.volume})")

                print('sample data errors in services ', sample_data_errors)
                # Creates the new objects
                if len(sample_data_errors) == 0:
                    try:
                        source_sample.volume = source_sample.volume - volume_used
                        source_sample.save()

                        # Create experiment run sample
                        experiment_run_sample = Sample.objects.get(id=source_sample.id)
                        experiment_run_sample.pk = None
                        experiment_run_sample.container = experiment_run.container

                        if data_experiment_container_coordinates:
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
                        print('in sample in services ', e)
                        sample_data_errors.append(e.messages)


            except Exception as e:
                sample_data_errors.append(
                    f"Sample from container {data_barcode} at coordinates {data_coordinates} not found")


        if len(sample_data_errors) > 0:
            errors.append(sample_data_errors)

        # if len(sample_data_errors) > 0:
        #     sample_data_errors.insert(0, f"Row #{data_row_id}: ")
        #     # TODO: handle error
        #     error = ValidationError(
        #         sample_data_errors, code="invalid")
        #     result.append_base_error(self.get_error_result_class()(error, ''))

    return {'errors': errors}
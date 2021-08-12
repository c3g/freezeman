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


from .instrument import get_instrument
from .container import get_or_create_container
from .process import create_processes_for_experiment_from_protocols_dict
from .property_value import create_properties_from_values_and_types

def create_experiment_run_complete(experiment_type_obj, instrument, container, start_date,
                 sample_rows, properties, protocols_dict, properties_by_name_dict):
    experiment_run = None
    errors = {}

    if len(sample_rows) < 1:
        errors['samples'] = f"No samples are associated to this experiment"

    instrument, errors['instrument'] = get_instrument(instrument['name'])

    comment = f"Automatically generated via experiment run creation on {datetime.utcnow().isoformat()}Z"

    container, errors['container'] = get_or_create_container(barcode=container['barcode'],
                                                                  kind=container['kind'],
                                                                  creation_comment=comment)

    top_process, experiment_processes_by_protocol_id, errors['process'] = create_processes_for_experiment_from_protocols_dict(protocols_objs_dict=protocols_dict,
                                                                         creation_comment=comment)

    try:
        experiment_run = ExperimentRun.objects.create(experiment_type=experiment_type_obj,
                                                      instrument=instrument,
                                                      container=container,
                                                      process=top_process,
                                                      start_date=start_date)

        print('SERVICES - experiment_run: ', experiment_run)

        _, errors['properties'] = create_properties_from_values_and_types(properties, properties_by_name_dict,
                                                                               experiment_processes_by_protocol_id)

        samples, errors['samples'] = get_and_associate_samples_to_experiment_run(experiment_run, sample_rows)

        print('SERVICES - samples/result: ', samples)


    except Exception as e:
        errors['experiment_run'] = ';'.join(e.messages)
        print('SERVICES - experiment_run/exception: ', e)

    return (experiment_run, errors)




def get_and_associate_samples_to_experiment_run(experiment_run, samples):
    sample_objs = []
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

                        sample_objs.append(experiment_run_sample)

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

    return (sample_objs, errors)
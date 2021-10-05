from django.core.exceptions import ValidationError
from datetime import datetime
from ..models import (
    ExperimentRun,
    ProcessMeasurement,
    Sample,
    SampleLineage
)
from ..utils import (
    blank_str_to_none,
    float_to_decimal,
)

from .instrument import get_instrument
from .container import create_container


def create_experiment_run(experiment_type_obj, process_obj, instrument, container, start_date):
    experiment_run = None
    errors = []
    warnings = []


    instrument, instrument_errors, instrument_warnings = get_instrument(instrument['name'])

    comment = f"Automatically generated via experiment run creation on {datetime.utcnow().isoformat()}Z"

    container, container_errors, container_warnings = create_container(barcode=container['barcode'],
                                                                       kind=container['kind'],
                                                                       coordinates=None,
                                                                       creation_comment=comment
                                                                      )

    errors += instrument_errors + container_errors
    warnings += instrument_warnings + container_warnings

    if not errors:
        try:
            experiment_run = ExperimentRun.objects.create(experiment_type=experiment_type_obj,
                                                          instrument=instrument,
                                                          container=container,
                                                          process=process_obj,
                                                          start_date=start_date)

            print('SERVICES - experiment_run: ', experiment_run)

        except ValidationError as e:
            errors.append(';'.join(e.messages))
            print('SERVICES - experiment_run/exception: ', e)


    return (experiment_run, errors, warnings)



def associate_samples_to_experiment_run(experiment_run, samples_rows_info):
    sample_objs = []
    errors = []
    warnings = []

    print('SERVICES - experiment_run - associate_samples_to_experiment_run - samples info ',
          samples_rows_info)

    for sample_info in samples_rows_info:
        sample_data_errors = []

        source_sample = sample_info['sample_obj']
        data_volume_used = sample_info['volume_used']
        data_experiment_container_coordinates = sample_info['experiment_container_coordinates']


        volume_used = float_to_decimal(blank_str_to_none(data_volume_used))
        if volume_used <= 0:
            sample_data_errors.append(f"Volume used ({volume_used}) is invalid ")
        if source_sample and volume_used > source_sample.volume:
            sample_data_errors.append(
                f"Volume used ({volume_used}) exceeds the current volume of the sample ({source_sample.volume})")

        print('sample data errors in services ', sample_data_errors)
        # Creates the new objects
        if not sample_data_errors:
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


        if not sample_data_errors:
            errors.append(sample_data_errors)


    return (sample_objs, errors, warnings)
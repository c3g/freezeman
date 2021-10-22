from django.core.exceptions import ValidationError
from datetime import datetime
from ..models import (
    ExperimentRun,
    ProcessMeasurement,
    Sample,
    SampleLineage
)

from .process import create_process
from .property_value import create_process_properties

from ..utils import (
    blank_str_to_none,
    float_to_decimal,
)

def create_experiment_run(experiment_type_obj,
                          instrument_obj,
                          container_obj,
                          start_date,
                          samples_info,
                          process_properties,
                          comment = f"Automatically generated via experiment run creation on {datetime.utcnow().isoformat()}Z",
                          protocols_dict = None):
    experiment_run = None
    errors = []
    warnings = []

    if not protocols_dict:
      protocols_dict = experiment_type_obj.get_protocols_dict()
    
    main_protocol = next(iter(protocols_dict))

    processes_by_protocol_id, process_errors, process_warnings = create_process(protocol=main_protocol, 
                                                                                create_children=True, 
                                                                                creation_comment=comment,
                                                                                preloaded_protocols=protocols_dict)

    _, properties_errors, properties_warnings = create_process_properties(process_properties, processes_by_protocol_id)

    errors += process_errors + properties_errors
    warnings += process_warnings + properties_warnings

    if not errors:
        try:
            experiment_run = ExperimentRun.objects.create(experiment_type=experiment_type_obj,
                                                          instrument=instrument_obj,
                                                          container=container_obj,
                                                          process=processes_by_protocol_id[main_protocol.id],
                                                          start_date=start_date)
        except ValidationError as e:
            errors.append(';'.join(e.messages))

    if experiment_run:
       _, samples_errors, samples_warnings = _associate_samples_to_experiment_run(experiment_run, samples_info)
    
    errors += samples_errors
    warnings += samples_warnings

    if samples_errors:
      experiment_run = None

    return (experiment_run, errors, warnings)



def _associate_samples_to_experiment_run(experiment_run, samples_info):
    sample_objs = []
    errors = []
    warnings = []

    for sample_info in samples_info:
        sample_data_errors = []

        source_sample = sample_info['sample_obj']
        data_volume_used = sample_info['volume_used']
        data_experiment_container_coordinates = sample_info['experiment_container_coordinates']


        volume_used = float_to_decimal(blank_str_to_none(data_volume_used))
        if volume_used <= 0:
            sample_data_errors.append(f"Volume used ({volume_used}) is invalid ")
        if source_sample and volume_used > source_sample.volume:
            sample_data_errors.append(f"Volume used ({volume_used}) exceeds the current volume of the sample ({source_sample.volume})")

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
                sample_data_errors.append(e.messages)

        if not sample_data_errors:
            errors.append(sample_data_errors)

    return (sample_objs, errors, warnings)
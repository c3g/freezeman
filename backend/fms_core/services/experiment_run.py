from datetime import datetime
import os
import json
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings

from fms_core.utils import make_timestamped_filename
from fms_core.services.experiment_run_info import generate_run_info
from ..models import ExperimentRun

from .process import create_process
from .property_value import create_process_properties
from .sample import transfer_sample

def create_experiment_run(experiment_run_name,
                          run_type_obj,
                          instrument_obj,
                          container_obj,
                          start_date,
                          samples_info,
                          process_properties,
                          comment=None,
                          protocols_dict=None, 
                          imported_template=None):
    experiment_run = None
    errors = []
    warnings = []

    if run_type_obj is None:
        errors.append('Run type is required to create an experiment run.')
    if process_properties is None:
        errors.append('Process properties are required to create an experiment run.')

    if errors:
        return None, errors, warnings

    if not protocols_dict:
        protocols_dict = run_type_obj.get_protocols_dict()
    
    main_protocol = next(iter(protocols_dict))

    processes_by_protocol_id, process_errors, process_warnings = create_process(protocol=main_protocol,
                                                                                creation_comment=comment if comment else f"Automatically generated via experiment run creation on {datetime.utcnow().isoformat()}Z",
                                                                                create_children=True, 
                                                                                children_protocols=protocols_dict[main_protocol],
                                                                                imported_template=imported_template)

    # Create process' properties
    if not process_errors:
        properties, properties_errors, properties_warnings = create_process_properties(process_properties, processes_by_protocol_id)

    errors += process_errors + properties_errors
    warnings += process_warnings + properties_warnings

    if not errors:
        try:
            experiment_run = ExperimentRun.objects.create(name=experiment_run_name,
                                                          run_type=run_type_obj,
                                                          instrument=instrument_obj,
                                                          container=container_obj,
                                                          process=processes_by_protocol_id[main_protocol.id],
                                                          start_date=start_date)
        except ValidationError as error:
            for field, message in error.message_dict.items():
                errors.append(f'{field}: {message[0]}')

    if experiment_run:
        for sample_info in samples_info:
            source_sample = sample_info['sample_obj']
            volume_used = sample_info['volume_used']
            container_coordinates = sample_info['experiment_container_coordinates']
            comment = sample_info['comment']
            workflow = sample_info.get('workflow', None)
            volume_destination = 0  # prevents this sample from being re-used or re-transferred afterwards

            sample_destination, transfer_errors, transfer_warnings = transfer_sample(process=experiment_run.process,
                                                                                     sample_source=source_sample,
                                                                                     container_destination=container_obj,
                                                                                     volume_used=volume_used,
                                                                                     execution_date=start_date,
                                                                                     coordinates_destination=container_coordinates,
                                                                                     volume_destination=volume_destination,
                                                                                     comment=comment,
                                                                                     workflow=workflow)

            if sample_destination:
                sample_destination.depleted = True # deplete destination sample
                sample_destination.save()

            errors += transfer_errors
            warnings += transfer_warnings

    if errors:
      experiment_run = None

    return (experiment_run, errors, warnings)

def start_experiment_run_processing(pk):
    '''
    Generates a run info file for an experiment and drops it in a spool directory
    watched by Tech Dev, which triggers run processing to be scheduled.

    If the run info file is generated without error then the run_processing_launch_date
    timestamp is updated with the current date and time.

    Args:
        The ID of the experiment.

    Returns:
        The path to the run info file that was created, and a list of errors and warnings.
    '''
    run_info = None
    errors = []
    warnings = []
    
    experiment_run = None
    try:
        experiment_run = ExperimentRun.objects.get(id=pk)
    except ExperimentRun.DoesNotExist:
        errors.append(f'Experiment run with id {pk} not found.')

    if experiment_run is not None:
        try:
            run_info = generate_run_info(experiment_run)
        except Exception as err:
            errors.append(f'An error occured while generating experiment run info. {str(err)}')

    run_info_file_path = None
    if run_info is not None:
        try:
            file_name_base = (experiment_run.name if experiment_run.name else 'experiment_run') + '.json'
            file_name = make_timestamped_filename(file_name_base)

            run_info_file_path = os.path.join(settings.RUN_INFO_OUTPUT_PATH, file_name)

            with open(run_info_file_path, "w", encoding="utf-8") as file:
                json.dump(run_info, file, indent=4)

            experiment_run.run_processing_launch_date = timezone.now()
            experiment_run.save()
        except Exception as e:
            errors.append(f'Failed to write run info file. {str(e)}')
               
    return (run_info_file_path, errors, warnings)

def get_run_info_for_experiment(pk):
    '''
    Returns a RunInfo object created for the given experiment.

    This function does not modify the experiment's 'launch' status, it simply
    generates the run info (to be downloaded by the client, for example).

    Args:
        The ID of the experiment.
    
    Returns:
        RunInfo object, if successful, and a list of errors and warnings.
    '''
    run_info = None
    errors = []
    warnings = []

    experiment_run = None
    try:
        experiment_run = ExperimentRun.objects.get(id=pk)
    except ExperimentRun.DoesNotExist:
        errors.append(f'Experiment run with id {pk} not found.')

    if experiment_run is not None:
        try:
            run_info = generate_run_info(experiment_run)
        except Exception as e:
            errors.append(str(e))
    
    return (run_info, errors, warnings)


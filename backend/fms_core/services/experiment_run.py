from django.core.exceptions import ValidationError
from datetime import datetime
from ..models import ExperimentRun

from .process import create_process
from .property_value import create_process_properties
from .sample import transfer_sample

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
                                                                                creation_comment=comment,
                                                                                create_children=True, 
                                                                                children_protocols=protocols_dict[main_protocol])

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
        for sample_info in samples_info:
            source_sample = sample_info['sample_obj']
            volume_used = sample_info['volume_used']
            container_coordinates = sample_info['experiment_container_coordinates']
            volume_destination = 0  # prevents this sample from being re-used or re-transferred afterwards

            _, transfer_errors, transfer_warnings = transfer_sample(process=experiment_run.process,
                                                                    sample_source=source_sample,
                                                                    container_destination=container_obj,
                                                                    volume_used=volume_used,
                                                                    date_execution=start_date,
                                                                    coordinates_destination=container_coordinates,
                                                                    volume_destination=volume_destination,
                                                                    destination_depleted=True)
            errors += transfer_errors
            warnings += transfer_warnings

    if errors:
      experiment_run = None

    return (experiment_run, errors, warnings)

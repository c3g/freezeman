from datetime import datetime
from django.core.exceptions import ValidationError

from fms_core.models import ProcessMeasurement

from ..utils import is_date_or_time_after_today


def create_process_measurement(process, source_sample, execution_date, volume_used=None, comment=None):
    process_measurement = None
    errors = []
    warnings = []

    # Validate parameters
    if not process:
        errors.append(f"Process is required for process measurement creation.")
    if not source_sample:
        errors.append(f"Source sample is required for process measurement creation.")
    if not execution_date:
        errors.append(f"Execution date with format YYYY-MM-DD is required for process measurement creation.")
    if is_date_or_time_after_today(execution_date):
        errors.append(f"Execution date cannot be greater than the current date.")

    if not errors:
        try:
            process_measurement = ProcessMeasurement.objects.create(process=process,
                                                                    source_sample=source_sample,
                                                                    execution_date=execution_date,
                                                                    comment=comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z"),
                                                                    # Optional attributes
                                                                    **(dict(volume_used=volume_used) if volume_used is not None else dict()),
            )
        except ValidationError as e:
            print(e)
            errors.append(f"Could not create ProcessMeasurement with Process ID {process.id} and Source sample {source_sample}.")

    return (process_measurement, errors, warnings)
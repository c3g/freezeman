from datetime import datetime
from django.core.exceptions import ValidationError

from fms_core.models import ProcessMeasurement


def create_process_measurement(process=None, source_sample=None, execution_date=None, volume_used=None, comment=None):
    process_measurement = None
    errors = []
    warnings = []

    try:
        process_measurement = ProcessMeasurement.create(
            process=process,
            source_sample=source_sample,
            execution_date=execution_date,
            volume_used=volume_used,
            comment=comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z"),
        )
    except ValidationError as e:
        errors.append(f"Could not create ProcessMeasurement with Process ID {process.id} and Source sample {source_sample}")

    return (process_measurement, errors, warnings)
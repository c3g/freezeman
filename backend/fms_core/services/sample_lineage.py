from django.core.exceptions import ValidationError
from fms_core.models import SampleLineage


def create_sample_lineage(parent_sample, child_sample, process_measurement):
    sample_lineage = None
    errors = []
    warnings = []

    try:
        sample_lineage = SampleLineage.objects.create(child=child_sample,
                                                      parent=parent_sample,
                                                      process_measurement=process_measurement
                                                      )
    except ValidationError as e:
        errors.append(str(e))

    return (sample_lineage, errors, warnings)

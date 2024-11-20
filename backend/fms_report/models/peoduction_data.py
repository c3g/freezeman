from django.db import models
from _constants import REPORTING_NAME_FIELD_LENGTH

from .report import Report
from .metric_field import MetricField


__all__ = ["ProductionData"]


class ProductionData(models.Model):
    sequencing_date
    library_creation_date
    run_name
    lane
    sample_name
    library_id
    library_batch_id
    is_internal_library
    biosample_id
    library_tyoe
    library_selection
    project
    principal_investigator
    taxon
    technology
    reads
    bases

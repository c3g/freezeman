from fms_report.models.production_data import ProductionData
from fms_report.models.production_tracking import ProductionTracking

from fms_core.models._constants import ValidationStatus
from fms_core.models.readset import Readset

from django.db.models import Q, F, When, Case, BooleanField, Prefetch, Count, Subquery, OuterRef, Sum, Max, BigIntegerField, functions

def prepare_production_report_data(log):
    queryset = Readset.objects.filter(validation_status=ValidationStatus.PASSED)
    queryset = queryset.exclude(production_tracking__validation_timestamp=F("validation_status_timestamp"))
    queryset = queryset.annotate(reads = Sum(functions.Cast("metrics__value_numeric", output_field=BigIntegerField()), filter= Q(metrics__name="nb_reads")))
    queryset = queryset.all().distinct().order_by()
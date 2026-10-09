from django.db.models import Count, Max, OuterRef, Subquery, Sum
from fms_core.models import DerivedBySample, Sample, Readset, Metric
from rest_framework import viewsets

from ._constants import _sample_reporting_filterset_fields
from fms_core.serializers import SampleReportingSerializer

class SampleReportingViewSet(viewsets.ModelViewSet):
    serializer_class = SampleReportingSerializer

    filterset_fields = {
        **_sample_reporting_filterset_fields
    }

    def get_queryset(self):
        root_samples = (
            Sample.objects
            .filter(child_of__isnull=True)
            .annotate(
                derived_sample_count=Count("derived_samples", distinct=True)
            )
            .filter(derived_sample_count=1)
        )
        reads_by_biosample = (
            Readset.objects
            .filter(
                derived_sample__biosample_id=OuterRef(
                    "derived_sample__biosample_id"
                )
            )
            .annotate(
                nb_reads=Subquery(
                    Metric.objects
                    .filter(readset=OuterRef("pk"), name="nb_reads")
                    .order_by("pk")
                    .values("value_numeric")[:1]
                )
            )
            .order_by()
            .values("derived_sample__biosample_id")
            .annotate(total_reads=Sum("nb_reads"))
            .values("total_reads")[:1]
        )

        return DerivedBySample.objects.filter(
            sample__in=root_samples,
            volume_ratio=1,
        ).annotate(
            number_of_reads=Subquery(reads_by_biosample),
            last_process_execution_date=Max("sample__process_measurement__execution_date"),
        )
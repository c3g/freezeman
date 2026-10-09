from django.db.models import Count
from rest_framework import viewsets

from fms_core.models import DerivedBySample, Sample
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

        return DerivedBySample.objects.filter(
            sample__in=root_samples,
            volume_ratio=1,
        )
from django.db.models import Exists, Max, OuterRef, Subquery, Sum
from fms_core.models import DerivedBySample,Readset, Metric,ProcessMeasurement,SampleLineage
from rest_framework import viewsets

from ._constants import _sample_reporting_filterset_fields
from fms_core.serializers import SampleReportingSerializer
from django.contrib.postgres.expressions import ArraySubquery

from rest_framework.response import Response
from ._utils import _list_keys




class SampleReportingViewSet(viewsets.ModelViewSet):
    serializer_class = SampleReportingSerializer

    filterset_fields = {
        **_sample_reporting_filterset_fields
    }

    ordering_fields = (
        *_list_keys(_sample_reporting_filterset_fields),
    )

    ordering = ["id"]


    def get_queryset(self):

        parents = SampleLineage.objects.filter(
            child_id=OuterRef("sample_id"),
        )

        other_derived_samples = (
            DerivedBySample.objects
            .filter(sample_id=OuterRef("sample_id"))
            .exclude(
                derived_sample_id=OuterRef("derived_sample_id")
            )
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

        latest_date_for_sample = (
        ProcessMeasurement.objects
        .filter(source_sample_id=OuterRef("source_sample_id"))
        .order_by("-execution_date")
        .values("execution_date")[:1]
        )

        last_processes = (
            ProcessMeasurement.objects
            .filter(
                source_sample_id=OuterRef("sample_id"),
                execution_date=Subquery(latest_date_for_sample),
            )
            .order_by("process_id")
            .values("process_id")
            .distinct()
        )

        return (
            DerivedBySample.objects
            .filter(volume_ratio=1)
            .alias(
                has_parent=Exists(parents),
                has_other_derived_sample=Exists(other_derived_samples),
            )
            .filter(
                has_parent=False,
                has_other_derived_sample=False,
            )
            .annotate(
                number_of_reads=Subquery(reads_by_biosample),
                last_process_execution_date=Max(
                    "sample__process_measurement__execution_date"
                ),
                last_process_ids=ArraySubquery(last_processes),
                last_process_names=ArraySubquery(
                    last_processes
                    .values("process__protocol__name")
                    .distinct("process_id")
                ),
            )
        )
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(
            self.get_queryset()
        ).prefetch_related(
            "sample__container",
            "derived_sample__biosample__individual__taxon",
            "project__parent_project",
        )

        page = self.paginate_queryset(queryset)
        rows = list(page) if page is not None else list(queryset)

        serializer = self.get_serializer(rows, many=True)

        if page is not None:
            return self.get_paginated_response(serializer.data)

        return Response(serializer.data)
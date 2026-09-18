from typing import cast

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.http import HttpResponseBadRequest
from fms_core.filters import ReadsetFilter
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Count, Subquery, OuterRef, Q, Sum, F
from fms_core.models import Metric, Readset
from fms_core.serializers import ReadsetSerializer, ReadsetWithMetricsSerializer
from fms_core.models._constants import ValidationStatus

from ._utils import _list_keys
from ._constants import _readset_filterset_fields

class ReadsetViewSet(viewsets.ModelViewSet):
    queryset = Readset.objects.select_related("dataset").select_related("dataset__experiment_run").all().distinct()
    queryset = queryset.annotate(
        number_reads = Subquery(
            Metric.objects
            .filter(readset=OuterRef("pk"), name="nb_reads").values('value_numeric')[:1]
        )
    )

    ordering_fields = (
        *_list_keys(_readset_filterset_fields),
        "number_reads"
    )

    filterset_fields = {
        **_readset_filterset_fields
    }
    ordering = ["id"]

    filterset_class = ReadsetFilter

    def get_serializer_class(self):
        with_metrics = self.request.query_params.get("withMetrics", False)
        if(with_metrics):
            return ReadsetWithMetricsSerializer
        return ReadsetSerializer

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.filter_queryset(Readset.objects.all())
        # so that library_type_distribution computes correctly
        qs = Readset.objects.filter(id__in=qs.values_list("id", flat=True))

        total_readsets = qs.count()
        total_runs: int = qs.annotate(run_count=Count("dataset__experiment_run", distinct=True)).aggregate(Sum("run_count", default=0))["run_count__sum"]
        total_samples: int = qs.annotate(sample_count=Count("derived_sample__biosample", distinct=True)).aggregate(Sum("sample_count", default=0))["sample_count__sum"]
        total_cohorts: int = qs.annotate(cohort_count=Count("derived_sample__biosample__individual__cohort", distinct=True)).aggregate(Sum("cohort_count", default=0))["cohort_count__sum"]

        library_type_distribution = (
            qs
            .values(type=F("derived_sample__library__library_type__name"))
            .annotate(count=Count("type"))
        )

        qs_metrics = qs

        nb_reads: int = qs_metrics.annotate(
            nb_reads=Subquery(
                Metric.objects.filter(readset=OuterRef("pk"), name="nb_reads").values('value_numeric')[:1]
            ),
        ).aggregate(Sum("nb_reads", default=0))["nb_reads__sum"]

        AVERAGED_METRIC_NAMES = ["avg_qual", "pf_read_alignment_rate", "duplicate_rate"]
        for metric_name in AVERAGED_METRIC_NAMES:
            qs_metrics = qs_metrics.annotate(**{
                metric_name: Subquery(
                    Metric.objects.filter(readset=OuterRef("pk"), name=metric_name).values('value_numeric')[:1]
                ),
            })
        averaged_metrics = {}
        for metric_name in AVERAGED_METRIC_NAMES:
            averaged_metrics[metric_name] = qs_metrics.filter(**{f"{metric_name}__isnull": False}).aggregate(Avg(metric_name, default=0))[f"{metric_name}__avg"]

        complete_count = qs_metrics.filter(**{
            f"{metric_name}__isnull": False
            for metric_name in AVERAGED_METRIC_NAMES
        }).count()

        return Response({
            "total_readsets": total_readsets,
            "total_runs": total_runs,
            "total_samples": total_samples,
            "total_cohorts": total_cohorts,
            "library_type_distribution": library_type_distribution,
            "nb_reads": nb_reads,
            **averaged_metrics,
            "complete_count": complete_count
        })

import csv
from typing import Any


from ._constants import _readset_filterset_fields
from ._utils import _list_keys
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import F, Q, Avg, Count, Max, OuterRef, QuerySet, StringAgg, Subquery, Sum, Value
from django.db.models.functions import JSONObject
from django.http import StreamingHttpResponse
from fms_core.filters import ReadsetFilter
from fms_core.models import Readset, Metric
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class ProjectReadsetViewSet(viewsets.ModelViewSet):
    queryset = Readset.objects.all()

    ordering_fields = (
        *_list_keys(_readset_filterset_fields),
    )

    filterset_fields = {
        **_readset_filterset_fields
    }
    ordering = ["id"]

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


    def list(self, _request):
        qs = self.filter_queryset(Readset.objects.all())
        qs = queryset_for_export(qs)
        result = self.paginate_queryset(qs)
        return Response({
            "count": len(result),
            "results": result
        })

    @action(detail=False, methods=["get"])
    def export_list(self, _request):
        qs = self.filter_queryset(Readset.objects.all())
        qs = queryset_for_export(qs, readset_files_q=StringAgg('files__file_path', delimiter=Value(";"), default=""))
        value_keys = [
            "id",
            "name",
            "sample_name",
            "alias",
            "cohort",
            "library_type",
            "run_name",
            "run_start_date",
            "validation_status",
            "nb_reads",
            "avg_qual",
            "pf_read_alignment_rate",
            "duplicate_rate",
            "yield",
            "readset_files",
        ]

        # https://docs.djangoproject.com/en/6.1/howto/outputting-csv/#streaming-large-csv-files
        class Echo:
            def write(self, value):
                return value
        pseudo_buffer = Echo()
        writer = csv.writer(pseudo_buffer)
        def stream_rows():
            yield writer.writerow(value_keys)
            for row in qs.values_list(*value_keys, flat=False):
                yield writer.writerow(row)

        return StreamingHttpResponse(
            stream_rows(),
            content_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="readsets.csv"'},
        )

READSET_FILES_TO_ARRAY = ArrayAgg(
    JSONObject(
        file_path=F("files__file_path"),
        size=F("files__size"),
    ),
    filter=Q(files__isnull=False),
    distinct=True,
    default=Value([]),
)

def queryset_for_export(queryset: QuerySet[Readset], readset_files_q: Any = READSET_FILES_TO_ARRAY):
    READSET_ANNOTATIONS = {
        "id": None,
        "name": None,
        "sample_name": None,
        "alias": F("derived_sample__biosample__alias"),
        "cohort": F("derived_sample__biosample__individual__cohort"),
        "library_type": F("derived_sample__library__library_type__name"),
        "run_name": F("dataset__experiment_run__name"),
        "run_start_date": F("dataset__experiment_run__start_date"),
        "validation_status": None,
        "nb_reads": Max(
            "metrics__value_numeric",
            filter=Q(metrics__name="nb_reads"),
        ),
        "avg_qual": Max(
            "metrics__value_numeric",
            filter=Q(metrics__name="avg_qual"),
        ),
        "pf_read_alignment_rate": Max(
            "metrics__value_numeric",
            filter=Q(metrics__name="pf_read_alignment_rate"),
        ),
        "duplicate_rate": Max(
            "metrics__value_numeric",
            filter=Q(metrics__name="duplicate_rate"),
        ),
        "yield": Max(
            "metrics__value_numeric",
            filter=Q(metrics__name="yield"),
        ),
        "readset_files": readset_files_q,
    }

    return (
        queryset
        .annotate(**{k:v for k,v in READSET_ANNOTATIONS.items() if v})
        .values(*READSET_ANNOTATIONS.keys())
    )

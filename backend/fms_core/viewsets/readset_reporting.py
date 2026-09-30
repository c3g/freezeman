from ._constants import _readset_filterset_fields
from ._utils import _list_keys
from django.db.models import F, Count, DecimalField, ExpressionWrapper, OuterRef, Subquery, Sum, Value
from fms_core.models import Readset, Metric
from fms_core.serializers import ReadsetReportingSerializer, ReadsetReportingExportSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class ReadsetReportingViewSet(viewsets.ModelViewSet):
    ordering_fields = (
        *_list_keys(_readset_filterset_fields),
    )
    filterset_fields = {
        **_readset_filterset_fields
    }
    ordering = ["id"]

    def get_queryset(self):
        METRICS = [
            "nb_reads",
            "avg_qual",
            "pf_read_alignment_rate",
            "duplicate_rate",
            "yield",
        ]
        return Readset.objects.annotate(
            **{
                metric: Metric.objects.filter(readset=OuterRef("pk"), name=metric).values("value_numeric")[:1]
                for metric in METRICS
            }
        )

    def get_serializer_class(self):
        if self.is_csv_request():
            return ReadsetReportingExportSerializer
        return ReadsetReportingSerializer

    def paginate_queryset(self, queryset):
        if self.is_csv_request():
            # Returning None disables pagination entirely for this request
            return None
        return super().paginate_queryset(queryset)

    def is_csv_request(self):
        # 1. Check if Content Negotiation resolved to CSV renderer
        if hasattr(self.request, 'accepted_renderer') and self.request.accepted_renderer.media_type == 'text/csv':
            return True
        # 2. Fallback: check Accept header directly
        if 'text/csv' in self.request.headers.get('Accept', ''):
            return True
        return False

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.is_csv_request():
            fields = ReadsetReportingSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: " ".join(s.capitalize() for s in i.split('_')) for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.filter_queryset(self.get_queryset())

        total_readsets = qs.count()
        total_runs: int = qs.values_list("dataset__experiment_run__id", flat=True).distinct().count()
        total_samples: int = qs.values_list("derived_sample__biosample__id", flat=True).distinct().count()
        total_cohorts: int = qs.values_list("derived_sample__biosample__individual__cohort", flat=True).distinct().count()

        library_type_distribution = (
            qs
            .values(type=F("derived_sample__library__library_type__name"))
            .annotate(count=Count("type"))
        ).order_by("type")

        total_nb_reads: int = qs.aggregate(Sum("nb_reads", default=0))["nb_reads__sum"]

        AVERAGED_METRICS = ["avg_qual", "pf_read_alignment_rate", "duplicate_rate"]

        complete_count = qs.filter(**{
            f"{metric_name}__isnull": False
            for metric_name in AVERAGED_METRICS
        }).count()

        aggregated_metrics: dict[str, float] = {}
        for metric_name in AVERAGED_METRICS:
            aggregated_metrics[metric_name] = (
                qs
                .annotate(weighted=ExpressionWrapper(F(metric_name) * F("nb_reads"), output_field=DecimalField()))
                .aggregate(avg=Sum("weighted") / Value(total_nb_reads, output_field=DecimalField()))["avg"]
            )

        return Response({
            "total_readsets": total_readsets,
            "total_runs": total_runs,
            "total_samples": total_samples,
            "total_cohorts": total_cohorts,
            "library_type_distribution": library_type_distribution,
            "nb_reads": total_nb_reads,
            **aggregated_metrics,
            "complete_count": complete_count
        })

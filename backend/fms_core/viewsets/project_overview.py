from fms_core.models.readset import Readset
from fms_core.serializers import ProjectOverviewReadsetMetricSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from django.db.models import Max, Q, F
from django.contrib.postgres.aggregates import ArrayAgg
from rest_framework.response import Response



def get_external_id_from_request(request):
    external_id = request.query_params.get("external_id")
    if not external_id:
        raise ValueError("external_id query parameter is required")
    return external_id


ACTIVE_READSET_FILTERS = {
    "deleted": False,
    "dataset__deleted": False,
    "dataset__project__deleted": False,
    "dataset__experiment_run__deleted": False,
    "dataset__experiment_run__run_type__deleted": False,
    "dataset__experiment_run__run_type__platform__deleted": False,
    "derived_sample__deleted": False,
    "derived_sample__biosample__deleted": False,
    "derived_sample__biosample__individual__deleted": False,
    "derived_sample__library__deleted": False,
    "derived_sample__library__library_type__deleted": False,
    "derived_sample__derived_by_samples__sample__deleted": False,
    "derived_sample__derived_by_samples__sample__container__deleted": False,
}


PROJECT_OVERVIEW_ORDERING = [
    "dataset__experiment_run__start_date",
    "dataset__experiment_run__name",
    "dataset__lane",
    "id",
]

PROJECT_OVERVIEW_VALUE_FIELDS = [
    "id",
    "name",
    "average_quality",
    "pf_reads_aligned",
    "duplicate_aligned",
]

PROJECT_OVERVIEW_VALUE_ALIASES = {
    "readset_sample_name": F("sample_name"),
    "external_id": F("dataset__project__external_id"),
    "run_name": F("dataset__experiment_run__name"),
    "run_start_date": F("dataset__experiment_run__start_date"),
    "alias": F("derived_sample__biosample__alias"),
    "cohort": F("derived_sample__biosample__individual__cohort"),
    "library_type": F("derived_sample__library__library_type__name"),
    "number_of_reads": F("production_data__reads"),
}


class ProjectOverviewViewSet(viewsets.GenericViewSet):

    queryset = Readset.objects.all()
    serializer_class = ProjectOverviewReadsetMetricSerializer


    @action(detail=False, methods=["get"])
    def reads(self, request):

        external_id = get_external_id_from_request(request)

        queryset = (
            Readset.objects.filter(
                **ACTIVE_READSET_FILTERS,
                dataset__project__external_id=external_id
            )
            .annotate(
                average_quality=Max(
                    "metrics__value_numeric",
                    filter=Q(metrics__name="avg_qual"),
                ),
                pf_reads_aligned=Max(
                    "metrics__value_numeric",
                    filter=Q(metrics__name="pf_read_alignment_rate"),
                ),
                duplicate_aligned=Max(
                    "metrics__value_numeric",
                    filter=Q(metrics__name="duplicate_rate"),
                ),
            )
            .order_by(*PROJECT_OVERVIEW_ORDERING)
            .values(
                *PROJECT_OVERVIEW_VALUE_FIELDS,
                **PROJECT_OVERVIEW_VALUE_ALIASES,
            )
            .annotate(
                barcodes=ArrayAgg(
                    "derived_sample__derived_by_samples__sample__container__barcode",
                    distinct=True,
                )
            )
        )
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
    
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
            

from django.db.models import F, Max, Q, Value
from django.db.models.functions import JSONObject
from django.contrib.postgres.aggregates import ArrayAgg

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


from fms_core.models import ParentProject, Readset
from fms_core.serializers import ParentProjectReadsetSerializer, ParentProjectSerializer
from ._utils import _list_keys
from ._constants import _parent_project_filterset_fields


class ParentProjectViewSet(viewsets.ModelViewSet):
    queryset = ParentProject.objects.all()
    serializer_class = ParentProjectSerializer
    permission_classes = [IsAuthenticated]

    ordering_fields = (
        *_list_keys(_parent_project_filterset_fields),
    )

    filterset_fields = {
        **_parent_project_filterset_fields,
    }

    ordering = ["external_id"]

    def _get_readsets_queryset(self, parent_project):

        PARENT_PROJECT_READSET_ORDERING = [
            "dataset__experiment_run__start_date",
            "dataset__experiment_run__name",
            "dataset__lane",
            "id",
        ]

        PARENT_PROJECT_READSET_VALUE_FIELDS = [
            "id",
            "name",
            "average_quality",
            "pf_reads_aligned",
            "duplicate_aligned",
            "readset_files",
            "container_barcodes",
            "run_validation_status",
        ]

        PARENT_PROJECT_READSET_VALUE_ALIASES = {
            "readset_sample_name": F("sample_name"),
            "biosample_id": F("derived_sample__biosample_id"),
            "external_id": F("dataset__project__parent_project__external_id"),
            "run_name": F("dataset__experiment_run__name"),
            "lane": F("dataset__lane"),
            "reference_genome_id": F("derived_sample__biosample__individual__reference_genome_id"),
            "sequencing_index_name": F("derived_sample__library__index__name"),
            "run_validation_status": F("validation_status"),
            "run_start_date": F("dataset__experiment_run__start_date"),
            "alias": F("derived_sample__biosample__alias"),
            "cohort": F("derived_sample__biosample__individual__cohort"),
            "library_type": F("derived_sample__library__library_type__name"),
            "number_of_reads": F("production_data__reads"),
        }

        return (
            Readset.objects.filter(
                dataset__project__parent_project=parent_project,
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
                readset_files=ArrayAgg(
                    JSONObject(
                        file_path=F("files__file_path"),
                        size=F("files__size"),
                    ),
                    filter=Q(files__isnull=False),
                    distinct=True,
                    default=Value([]),
                ),
                container_barcodes=ArrayAgg(
                    "derived_sample__derived_by_samples__sample__container__barcode",
                    distinct=True,
                ),
            )
            .order_by(*PARENT_PROJECT_READSET_ORDERING)
            .values(
                *PARENT_PROJECT_READSET_VALUE_FIELDS,
                **PARENT_PROJECT_READSET_VALUE_ALIASES,
            )
        
        )


    @action(detail=True, methods=["get"],url_path="readsets")
    def overview_readsets(self, request, pk=None):
        parent_project = self.get_object()

        queryset = self._get_readsets_queryset(parent_project)
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = ParentProjectReadsetSerializer(page, many=True,)
            return self.get_paginated_response(serializer.data)

        else:

            serializer = ParentProjectReadsetSerializer(queryset, many=True,)
            return Response(serializer.data)


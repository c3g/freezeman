from collections import defaultdict

from fms_core.models.project import Project
from fms_core.models.readset import Readset
from fms_core.serializers import ProjectOverviewLibrarySerializer, ProjectOverviewProjectsByExternalIDSerializer, ProjectOverviewReadsetMetricSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from django.db.models import Max, Q, F
from django.contrib.postgres.aggregates import ArrayAgg,JSONBAgg
from rest_framework.response import Response

from django.db.models.functions import JSONObject



def get_external_id_from_request(request):
    external_id = request.query_params.get("external_id")
    if not external_id:
        raise ValueError("external_id query parameter is required")
    return external_id


def get_external_id_number(external_id):
    if not external_id:
        return None   
    return int(external_id[1:]) 


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
    "readset_file_paths",
    "readset_file_sizes",
    "validation_status",
]

PROJECT_OVERVIEW_VALUE_ALIASES = {
    "readset_sample_name": F("sample_name"),
    "external_id": F("dataset__project__external_id"),
    "run_name": F("dataset__experiment_run__name"),
    "lane": F("dataset__lane"),
    "reference_genome_id": F("derived_sample__biosample__individual__reference_genome_id"),
    "sequencing_index_name": F("derived_sample__library__index__name"),
    "run_start_date": F("dataset__experiment_run__start_date"),
    "alias": F("derived_sample__biosample__alias"),
    "cohort": F("derived_sample__biosample__individual__cohort"),
    "library_type": F("derived_sample__library__library_type__name"),
    "number_of_reads": F("production_data__reads"),
}


LIBRARIES_ALIASES = {
    "library_id": F("derived_sample__library__id"),
    "index_id": F("derived_sample__library__index_id"),
    "strandedness": F("derived_sample__library__strandedness"),
    "library_type_id": F("derived_sample__library__library_type__id"),
    "library_type_name": F("derived_sample__library__library_type__name"),
    "platform_id": F("derived_sample__library__platform_id"),
    "platform_name": F("derived_sample__library__platform__name"),
    "library_selection_name": F("derived_sample__library__library_selection__name"),
    "library_selection_target": F("derived_sample__library__library_selection__target"),
    "index_name": F("derived_sample__library__index__name"),
    "biosample_alias": F("derived_sample__biosample__alias"),
    "collection_site": F("derived_sample__biosample__collection_site"),
    "individual_name": F("derived_sample__biosample__individual__name"),


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
                readset_file_paths=ArrayAgg(
                    "files__file_path",
                    distinct=True,
                ),
                readset_file_sizes=ArrayAgg(
                    "files__size",
                    distinct=True,
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
        
        else:

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def projects_by_external_id(self, request):
        projects = Project.objects.all()        

        grouped_projects_map = defaultdict(list)

        for project in projects:
            group_key = project.external_id or ""
            grouped_projects_map[group_key].append(project)

        grouped_projects = [
            {
                "external_id": external_id or None,
                "external_id_number": get_external_id_number(external_id),
                "external_project_name": projects[0].external_name if projects else None,
                "project_count": len(projects),
                "projects": projects,
            }
            for external_id, projects in grouped_projects_map.items()
        ]

        grouped_projects.sort(
            key=lambda group: group["external_id_number"] or 0,
            reverse=True,
        )

        serializer = ProjectOverviewProjectsByExternalIDSerializer(
            grouped_projects,
            many=True,
        )
        return Response(serializer.data)
    
    #project → dataset → readset → derivedsample → library pour les data concernant <Library>
    @action(detail=False, methods=["get"])
    def libraries(self, request):
        external_id = get_external_id_from_request(request)

        queryset = (
            Readset.objects.filter(
                **ACTIVE_READSET_FILTERS,
                dataset__project__external_id=external_id
            )
            .values(
               **LIBRARIES_ALIASES
            )
        .distinct()
        )
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = ProjectOverviewLibrarySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        else:
            serializer = ProjectOverviewLibrarySerializer(queryset, many=True)
            return Response(serializer.data)

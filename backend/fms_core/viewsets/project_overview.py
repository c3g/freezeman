from collections import defaultdict
from fms_core.models.sample_lineage import SampleLineage
from fms_core.models.project import Project
from fms_core.models.readset import Readset
from fms_core.serializers import ProjectOverviewProjectsByExternalIDSerializer, ProjectOverviewReadsetMetricSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from django.contrib.postgres.aggregates import ArrayAgg
from rest_framework.response import Response
from fms_core.viewsets._fetch_data import FetchLibraryData

from django.db.models import Case, Exists, Max, When, BooleanField, F, Q, OuterRef, Subquery
from fms_core.models import Sample, DerivedBySample
from django.db.models import Count


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


EXCLUDE_DELETED_LIBRAIRIES_FILTERS = {"derived_samples__library__isnull": False}




def get_external_id_from_request(request):
    external_id = request.query_params.get("external_id")
    if not external_id:
        raise ValueError("external_id query parameter is required")
    return external_id


def get_external_id_number(external_id):
    if not external_id:
        return None   
    return int(external_id[1:]) 

has_child_library = SampleLineage.objects.filter(
    parent=OuterRef("pk"),
    child__derived_samples__library__isnull=False,
    child__deleted=False,
)


class ProjectOverviewViewSet(viewsets.GenericViewSet,FetchLibraryData):

    ordering_fields = ()

    def get_queryset(self):

        if self.action == "reads":
            return Readset.objects.all()
        
        if self.action == "projects_by_external_id":
            return Project.objects.all()

     #   if self.action == "samples":
     #       return Sample.objects.none()

        if self.action == "libraries":
            external_id = getattr(self, "project_libraries_external_id", None)

            if external_id is None:
                external_id = get_external_id_from_request(self.request)

            return self.get_project_libraries_queryset(external_id)

        # Par default, return an empty queryset for other actions
        return Readset.objects.none()
    

    def get_project_libraries_queryset(self, external_id):
        queryset = Sample.objects.select_related("container").all().distinct()

        # La ligne ci dessous exlut les pool. Is_pool netant pas un attribut de Sample, mais plutot une propriete calculee.
        queryset = (Sample.objects.select_related("container").annotate(derived_count=Count("derived_by_samples")).filter(derived_count__lte=1))

        #exclure les libraries qui apparaissent comme parent dans SampleLineage quand leur child est aussi une library.
        queryset = queryset.annotate(is_terminal_library=Exists(has_child_library)).filter(is_terminal_library=False)
      
        queryset = queryset.filter(**EXCLUDE_DELETED_LIBRAIRIES_FILTERS, derived_by_samples__project__external_id=external_id)
        queryset = queryset.annotate(
        qc_flag=Case(
            When(Q(quality_flag=False) | Q(quantity_flag=False) | Q(identity_flag=False), then=False,),
            When(Q(quality_flag=True) | Q(quantity_flag=True),then=True,),
            default=None,
            output_field=BooleanField(),
        )
    )
        queryset = queryset.annotate(quantity_ng=F("concentration") * F("volume")
    )
        queryset = queryset.annotate(
        first_volume_ratio=Subquery(
            DerivedBySample.objects
            .filter(sample=OuterRef("pk"))
            .values_list("volume_ratio", flat=True)[:1]
        )
    )

        return queryset
    

    @action(detail=False, methods=["get"])
    def reads(self, request):

        queryset = self.get_queryset()

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
           serializer = ProjectOverviewReadsetMetricSerializer(page, many=True)
           return self.get_paginated_response(serializer.data)
        
        else:

            serializer = ProjectOverviewReadsetMetricSerializer(queryset, many=True)
            return Response(serializer.data)
        

    

    @action(detail=False, methods=["get"])
    def projects_by_external_id(self, request):
        projects = self.get_queryset()       

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
    
    

    @action(detail=False, methods=["get"])
    def libraries(self, request):
        external_id = get_external_id_from_request(request)

        #On utilise self.project_libraries_external_id et self.queryset a cause des du mixin FetchLibraryData 
        # qui utilise ces attributs pour filtrer les données. 

        self.project_libraries_external_id = external_id
        self.queryset = self.filter_queryset(self.get_queryset())

        serialized_data, count = self.fetch_data()

        return Response({
            "results": serialized_data,
            "count": count,
    })
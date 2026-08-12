from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Count, Exists, F, OuterRef, Q, Subquery

from fms_core.models import ParentProject, ProcessMeasurement, Sample, SampleLineage


# Individual : Patient-001
# Biosample : prélèvement sanguin du Patient-001
# DerivedSample : ADN extrait de ce prélèvement
# Sample : tube physique contenant cet ADN

PARENT_PROJECT_SAMPLE_VALUE_FIELDS = [
    "biosample_id",
    "id",
    "project_ids",
    "project_names",
    "name",
    "alias",
    "container_barcode",
    "individual",
    "creation_date",
    "collection_site",
    "comment",
    "experimental_groups",
    "volume",
    "concentration",
    "quality_flag",
    "quantity_flag",
    "identity_flag",
    "last_process_id",
    "last_process_name",
    "last_process_execution_date",
]

PARENT_PROJECT_SAMPLE_ORDERING = [
    "biosample_id",
    "id",
]

ACTIVE_PARENT_PROJECT_RELATION_FILTERS = {
    "derived_by_samples__project__deleted": False,
    "derived_by_samples__project__parent_project__deleted": False,
}

ACTIVE_SAMPLE_FILTERS = {
    "deleted": False,
    "derived_by_samples__deleted": False,
    "derived_samples__deleted": False,
    "derived_samples__biosample__deleted": False,
    "container__deleted": False,
}


ACTIVE_OR_MISSING_INDIVIDUAL_FILTER = (
    Q(derived_samples__biosample__individual__isnull=True)
    | Q(derived_samples__biosample__individual__deleted=False)
)

PARENT_SAME_BIOSAMPLE = SampleLineage.objects.filter(
    deleted=False,
    child=OuterRef("pk"),
    parent__deleted=False,
    parent__derived_by_samples__deleted=False,
    parent__derived_samples__deleted=False,
    parent__derived_samples__biosample__deleted=False,
    parent__derived_samples__biosample_id=OuterRef(
        "derived_samples__biosample_id",
    ),
)

# Exclut les pools et les libraries.
def exclude_pools_and_libraries(queryset):
    return queryset.annotate(
        active_derived_sample_count=Count(
            "derived_by_samples",
            filter=Q(derived_by_samples__deleted=False),
            distinct=True,
        ),
    ).filter(
        active_derived_sample_count__lte=1,
        derived_samples__library__isnull=True,
    )

# Retourne les Samples actifs qui ne sont ni des pools ni des libraries.
def get_active_non_pool_non_library_samples():
    queryset = exclude_pools_and_libraries(Sample.objects.all(),)

    return queryset.filter(
        **ACTIVE_SAMPLE_FILTERS,
    ).filter(
        ACTIVE_OR_MISSING_INDIVIDUAL_FILTER,
    )



# Ajoute le biosample associé à chaque Sample.
def add_biosample_id(queryset):
    return queryset.annotate(
        biosample_id=F("derived_samples__biosample_id"),
    )


# Conserve le premier Sample sans parent pour chaque biosample.
def keep_initial_sample_per_biosample(queryset):
    initial_sample = (
        get_active_non_pool_non_library_samples()
        .filter(
            derived_samples__biosample_id=OuterRef("biosample_id"),
        )
        .annotate(
            has_parent_same_biosample=Exists(
                PARENT_SAME_BIOSAMPLE,
            ),
        )
        .filter(
            has_parent_same_biosample=False,
        )
        .order_by(
            "creation_date",
            "id",
        )
    )

    return queryset.annotate(
        initial_sample_id=Subquery(
            initial_sample.values("id")[:1],
        ),
    ).filter(
        id=F("initial_sample_id"),
    )



# Ajoute les projets internes associés au biosample.
def add_internal_projects(queryset, parent_project):
    project_path = (
        "derived_samples__biosample__"
        "derived_samples__derived_by_samples__project"
    )

    project_filter = Q(
        derived_samples__biosample__derived_samples__deleted=False,
        derived_samples__biosample__derived_samples__derived_by_samples__deleted=False,
        derived_samples__biosample__derived_samples__derived_by_samples__project__deleted=False,
        derived_samples__biosample__derived_samples__derived_by_samples__project__parent_project=parent_project,
    )

    return queryset.annotate(
        project_ids=ArrayAgg(
            f"{project_path}_id",
            filter=project_filter,
            distinct=True,
            order_by=f"{project_path}_id",
        ),
        project_names=ArrayAgg(
            f"{project_path}__name",
            filter=project_filter,
            distinct=True,
            order_by=f"{project_path}__name",
        ),
    )


# Ajoute les informations du Sample et du biosample.
def add_sample_information(queryset):
    return queryset.annotate(
        alias=F("derived_samples__biosample__alias",),
        container_barcode=F("container__barcode",),
        individual=F("derived_samples__biosample__individual__name",),
        collection_site=F("derived_samples__biosample__collection_site",),
    )


# Ajoute les groupes expérimentaux du Sample.
def add_experimental_groups(queryset):
    return queryset.annotate(
        experimental_groups=F(
            "derived_samples__experimental_group",
        ),
    )



# Ajoute le dernier processus appliqué au Sample.
def add_last_process_information(queryset):
    last_process = (
        ProcessMeasurement.objects.filter(
            source_sample=OuterRef("pk"),
            deleted=False,
            process__deleted=False,
            process__protocol__deleted=False,
        )
        .order_by(
            "-execution_date",
            "-id",
        )
    )

    return queryset.annotate(
        last_process_id=Subquery(
            last_process.values("process_id")[:1],
        ),
        last_process_name=Subquery(
            last_process.values(
                "process__protocol__name",
            )[:1],
        ),
        last_process_execution_date=Subquery(
            last_process.values(
                "execution_date",
            )[:1],
        ),
    )


# Sélectionne et ordonne les champs retournés par l’API.
def format_parent_project_samples(queryset):
    return queryset.order_by(
        *PARENT_PROJECT_SAMPLE_ORDERING,
    ).values(
        *PARENT_PROJECT_SAMPLE_VALUE_FIELDS,
    )



def get_parent_project_samples_queryset(
    parent_project: ParentProject,
):
    queryset = get_active_non_pool_non_library_samples()

    queryset = queryset.filter(
        derived_by_samples__project__parent_project=parent_project,
        **ACTIVE_PARENT_PROJECT_RELATION_FILTERS,
    )

    queryset = add_biosample_id(queryset)
    queryset = keep_initial_sample_per_biosample(queryset)
    queryset = add_internal_projects(queryset,parent_project,)
    queryset = add_sample_information(queryset)
    queryset = add_experimental_groups(queryset)
    queryset = add_last_process_information(queryset)
    return format_parent_project_samples(queryset)

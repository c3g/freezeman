from django.contrib.postgres.expressions import ArraySubquery
from django.db.models import Exists, F, OuterRef, Q, Subquery

from fms_core.models import (
    Biosample,
    DerivedBySample,
    ParentProject,
    ProcessMeasurement,
    Sample,
    SampleLineage,
)


# Individual : Patient-001 : Un Individual, c’est la personne, l’animal ou l’organisme dont vient l’échantillon.
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
    "creation_date",
    "id",
]

PARENT_SAME_BIOSAMPLE = SampleLineage.objects.filter(
    deleted=False,
    child=OuterRef("pk"),
    parent__deleted=False,
    parent__derived_by_samples__deleted=False,
    parent__derived_by_samples__derived_sample__deleted=False,
    parent__derived_by_samples__derived_sample__biosample__deleted=False,
    parent__derived_by_samples__derived_sample__biosample_id=OuterRef(
        "biosample_id",
    ),
)


# Exclut les pools et les libraries.
def exclude_pools_and_libraries(queryset):
    active_links = DerivedBySample.objects.filter(
        sample_id=OuterRef("pk"),
        deleted=False,
        derived_sample__deleted=False,
    )
    library_link = active_links.filter(derived_sample__library__isnull=False,)
    return queryset.annotate(
        has_multiple_active_links=Exists(
            active_links.order_by("id")[1:2],
        ),
        has_active_library=Exists(
            library_link,
        ),
    ).filter(
        has_multiple_active_links=False,
        has_active_library=False,
    )

# Retourne les biosamples associés au Parent Project.
def get_parent_project_biosample_ids(parent_project):
    return (
        DerivedBySample.objects.filter(
            deleted=False,
            derived_sample__deleted=False,
            derived_sample__biosample__deleted=False,
            project__isnull=False,
            project__deleted=False,
            project__parent_project=parent_project,
            project__parent_project__deleted=False,
        )
        .order_by()
        .values_list(
            "derived_sample__biosample_id",
            flat=True,
            )
        .distinct()
    )

# Retourne les IDs des Samples associés aux biosamples demandés.
def get_biosample_sample_ids(biosample_ids):
    return (
        DerivedBySample.objects.filter(
            deleted=False,
            derived_sample__deleted=False,
            derived_sample__biosample__deleted=False,
            derived_sample__biosample_id__in=biosample_ids,)
        .order_by()
        .values_list(
            "sample_id",
            flat=True,
            )
        .distinct()
    )


# Retourne les Samples actifs correspondant aux IDs demandés.
def get_active_non_pool_non_library_samples(sample_ids):
    queryset = Sample.objects.filter(
        id__in=sample_ids,
        deleted=False,
        container__deleted=False,
    )
    return exclude_pools_and_libraries(queryset)


# Ajoute le biosample associé à chaque Sample.
def add_biosample_id(queryset):
    sample_link = (
        DerivedBySample.objects.filter(
            sample_id=OuterRef("pk"),
            deleted=False,
            derived_sample__deleted=False,
            derived_sample__biosample__deleted=False,
        )
        .order_by("id")
    )

    return queryset.annotate(
        biosample_id=Subquery(
            sample_link.values(
                "derived_sample__biosample_id",
            )[:1],
        ),
    )


# Conserve uniquement les Samples sans parent du même biosample.
def keep_initial_sample_per_biosample(queryset):
    return queryset.annotate(
        has_parent_same_biosample=Exists(
            PARENT_SAME_BIOSAMPLE,
        ),
    ).filter(
        has_parent_same_biosample=False,
    )


# Ajoute les projets internes associés au biosample.
def add_internal_projects(queryset, parent_project):
    project_links = (
        DerivedBySample.objects.filter(
            derived_sample__biosample_id=OuterRef(
                "biosample_id",
            ),
            deleted=False,
            derived_sample__deleted=False,
            derived_sample__biosample__deleted=False,
            project__isnull=False,
            project__deleted=False,
            project__parent_project=parent_project,
            project__parent_project__deleted=False,
        )
    )

    project_ids = (
        project_links
        .order_by("project_id")
        .values("project_id")
        .distinct()
    )

    project_names = (
        project_links
        .order_by("project__name")
        .values("project__name")
        .distinct()
    )

    return queryset.annotate(
        project_ids=ArraySubquery(
            project_ids,
        ),
        project_names=ArraySubquery(
            project_names,
        ),
    )

# Ajoute les informations du Sample et du biosample.
def add_sample_information(queryset):
    biosample = Biosample.objects.filter(
        id=OuterRef("biosample_id"),
        deleted=False,
    )

    active_or_missing_individual = (
        Q(individual__isnull=True)
        | Q(individual__deleted=False)
    )

    biosample = biosample.filter(
        active_or_missing_individual,
    )

    return queryset.annotate(
        alias=Subquery(biosample.values("alias")[:1],),
        container_barcode=F("container__barcode",),
        individual=Subquery(
            biosample.values(
                "individual__name",
            )[:1],
        ),
        collection_site=Subquery(
            biosample.values(
                "collection_site",
            )[:1],
        ),
    )

# Ajoute les groupes expérimentaux du Sample.
def add_experimental_groups(queryset):
    sample_link = (
        DerivedBySample.objects.filter(
            sample_id=OuterRef("pk"),
            deleted=False,
            derived_sample__deleted=False,
        )
        .order_by("id")
    )

    return queryset.annotate(
        experimental_groups=Subquery(
            sample_link.values(
                "derived_sample__experimental_group",
            )[:1],
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
        last_process_id=Subquery(last_process.values("process_id")[:1],),
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


# Conserve une seule ligne par biosample et sélectionne les champs de l’API.
def format_parent_project_samples(queryset):
    return (
        queryset
        .order_by(
            *PARENT_PROJECT_SAMPLE_ORDERING,
        )
        .distinct(
            "biosample_id",
        )
        .values(
            *PARENT_PROJECT_SAMPLE_VALUE_FIELDS,
        )
    )

def get_parent_project_samples_queryset(parent_project: ParentProject,):
    biosample_ids = list(
        get_parent_project_biosample_ids(parent_project,),
    )

    sample_ids = list(
        get_biosample_sample_ids(biosample_ids,),
    )

    queryset = get_active_non_pool_non_library_samples(sample_ids,)

    queryset = add_biosample_id(queryset)
    queryset = keep_initial_sample_per_biosample(queryset)
    queryset = add_internal_projects(queryset,parent_project,) # We also need the list of the project in which the sample is 
    queryset = add_sample_information(queryset)
    queryset = add_experimental_groups(queryset)
    queryset = add_last_process_information(queryset)

    return format_parent_project_samples(queryset)
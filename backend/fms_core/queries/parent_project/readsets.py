from django.db.models import F, Max, Q, Value
from fms_core.models import ParentProject, Readset
from django.contrib.postgres.aggregates import ArrayAgg



def get_parent_project_readsets_queryset(parent_project: ParentProject,):
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
        "readset_file_paths",
        "readset_file_sizes",
        "barcodes",
        "validation_status",
    ]

    PARENT_PROJECT_READSET_VALUE_ALIASES = {
        "readset_sample_name": F("sample_name"),
        "external_id": F("dataset__project__parent_project__external_id"),
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
            readset_file_paths=ArrayAgg(
                "files__file_path",
                filter=Q(files__isnull=False),distinct=True,default=Value([]),
            ),
            readset_file_sizes=ArrayAgg(
                "files__size",
                filter=Q(files__isnull=False),distinct=True,default=Value([]),
            ),
            barcodes=ArrayAgg(
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

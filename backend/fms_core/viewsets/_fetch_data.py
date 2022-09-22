import json
from typing import List
from django.db.models import OuterRef, Subquery, Exists, Count, Prefetch

from fms.settings import REST_FRAMEWORK
from fms_core.models import Sample, DerivedBySample, DerivedSample, SampleLineage

def fetch_sample_data(ids: List[int] =[], queryset=None, query_params=None) -> List:
    """
    Function used to replace the sample serializer across various viewsets.

    Args:
        ids: List of ids to select specific samples. Defaults to [].
        queryset: When called from sample viewset, you can provide the viewset prefiltered queryset. Defaults to None.
        query_params: You can provide the query params for additional data formatting. Defaults to None.

    Returns:
        Returns a list of serialized data dictionary (samples)
    """
    if queryset is None:
        derived_samples = DerivedSample.objects.all().select_related('biosample', 'biosample__individual')
        queryset = Sample.objects.all().prefetch_related(Prefetch('derived_samples', queryset=derived_samples))

    if query_params is not None:
        limit = int(query_params.get('limit', REST_FRAMEWORK["PAGE_SIZE"]))
        offset = int(query_params.get('offset', 0))

    # No filtering for empty ids list otherwise use most effective selector
    if len(ids) == 1:
        queryset.filter(id=ids[0])
    elif len(ids) > 1:
        queryset.filter(id__in=ids)

    samples_queryset = queryset.annotate(
        first_derived_sample=Subquery(
            DerivedBySample.objects
            .filter(sample=OuterRef("pk"))
            .values_list("derived_sample", flat=True)[:1]
        )
    )

    sample_values_queryset = (
        samples_queryset
        .annotate(is_library=Exists(samples_queryset.filter(derived_samples__library__isnull=False)))
        .annotate(derived_count=Count("derived_samples"))
        .annotate(extracted_from=Subquery(
                SampleLineage.objects
                .filter(child=OuterRef("pk"), process_measurement__process__protocol__name="Extraction")
                .values_list("parent", flat=True)[:1]
            )
        )[offset:offset+limit]
        .values(
            'id',
            'name',
            'container_id',
            'coordinates',
            'volume',
            'concentration',
            'creation_date',
            'quality_flag',
            'quantity_flag',
            'depleted',
            'comment',
            'is_library',
            'derived_count',
            'first_derived_sample',
            'derived_samples__project',
            'child_of',
            'extracted_from',
            'process_measurement',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
            'deleted',
        )
    )
    samples = { s["id"]: s for s in sample_values_queryset }
    derived_sample_ids = [sample_values["first_derived_sample"]for sample_values in sample_values_queryset]
    derived_sample_values_queryset = (
        DerivedSample.objects
        .filter(id__in=derived_sample_ids)
        .values(
            "id",
            "biosample_id",
            "biosample__alias",
            "sample_kind_id",
            "tissue_source_id",
            "biosample__collection_site",
            "experimental_group",
            "biosample__individual_id",
        )
    )
    derived_samples = { ds["id"]: ds for ds in derived_sample_values_queryset }

    serialized_data = []
    for sample in samples.values():
        derived_sample = derived_samples[sample["first_derived_sample"]]
        is_pool = sample["derived_count"] > 1
        is_library = sample["is_library"]
        data = {
            'id': sample["id"],
            'biosample_id': derived_sample["biosample_id"] if not is_pool else None,
            'name': sample["name"],
            'alias': derived_sample["biosample__alias"] if not is_pool else None,
            'volume': sample["volume"],
            'depleted': sample["depleted"],
            'concentration': sample["concentration"],
            'child_of': sample["child_of"],
            'extracted_from': sample["extracted_from"] if not is_pool else None,
            'individual': derived_sample["biosample__individual_id"] if not is_pool else None,
            'container': sample["container_id"],
            'coordinates': sample["coordinates"],
            'sample_kind': derived_sample["sample_kind_id"] if not is_pool or (is_pool and not is_library) else "POOL",
            'is_library': is_library,
            'is_pool': is_pool,
            'projects': sample["derived_samples__project"],
            'process_measurements': sample["process_measurement"],
            'tissue_source': derived_sample["tissue_source_id"] if not is_pool else None,
            'creation_date': sample["creation_date"],
            'collection_site': derived_sample["biosample__collection_site"] if not is_pool else None,
            'experimental_group': json.dumps(derived_sample["experimental_group"]) if not is_pool else None,
            'quality_flag': sample["quality_flag"],
            'quantity_flag': sample["quantity_flag"],
            'created_by': sample["created_by"],
            'created_at': sample["created_at"],
            'updated_by': sample["updated_by"],
            'updated_at': sample["updated_at"],
            'deleted': sample["deleted"],
            'comment': sample["comment"],
        }
        serialized_data.append(data)
    return serialized_data
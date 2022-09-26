
from typing import List
from collections import defaultdict
from django.db.models import OuterRef, Subquery, Count, Prefetch, Q, ExpressionWrapper, BooleanField

from fms.settings import REST_FRAMEWORK
from fms_core.models import Sample, DerivedBySample, DerivedSample, SampleLineage, ProcessMeasurement
from fms_core.services.library import convert_library_concentration_from_ngbyul_to_nm

from ..utils import convert_concentration_from_ngbyul_to_nm


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

    # Annotate sample queryset
    samples_queryset = samples_queryset.annotate(derived_count=Count("derived_samples"))
    samples_queryset = samples_queryset[offset:offset+limit] # page the queryset
    sample_values_queryset = (
        samples_queryset
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
            'derived_count',
            'first_derived_sample',
            'child_of',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
            'deleted',
        )
    )
    
    if not samples_queryset:
        return [] # Do not lose time processing data for an empty queryset
    else:
        samples = { s["id"]: s for s in sample_values_queryset }
        samples_ids = samples.keys() 
        derived_sample_ids = [sample_values["first_derived_sample"]for sample_values in sample_values_queryset]
        derived_sample_values_queryset = (
            DerivedSample.objects
            .filter(id__in=derived_sample_ids)
            .annotate(is_library=ExpressionWrapper(Q(library__isnull=False), output_field=BooleanField()))
            .values(
                "id",
                "is_library",
                "project_id",
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

        # Building subquery Process measurement
        pms = ProcessMeasurement.objects.filter(source_sample_id__in=samples_ids).values("source_sample_id", "id")
        pms_by_sample = defaultdict(list)
        for pm in pms:
            pms_by_sample[pm["source_sample_id"]].append(pm["id"])

        # Building subquery Lineage
        samples_extracted_from = SampleLineage.objects.filter(child__in=samples_ids) \
                                                      .filter(process_measurement__process__protocol__name="Extraction") \
                                                      .values("child_id", "parent_id",)
        extract_by_sample = {}
        for extracted in samples_extracted_from:
            extract_by_sample[extracted["child_id"]] = extracted["parent_id"]
        serialized_data = []
        for sample in samples.values():
            derived_sample = derived_samples[sample["first_derived_sample"]]
            is_pool = sample["derived_count"] > 1
            is_library = derived_sample["is_library"]
            process_measurements = pms_by_sample[sample["id"]]
            extracted_from = extract_by_sample.get(sample["id"], None)
            data = {
                'id': sample["id"],
                'biosample_id': derived_sample["biosample_id"] if not is_pool else None,
                'name': sample["name"],
                'alias': derived_sample["biosample__alias"] if not is_pool else None,
                'volume': sample["volume"],
                'depleted': sample["depleted"],
                'concentration': sample["concentration"],
                'child_of': sample["child_of"] if not is_pool else None,
                'extracted_from': extracted_from if not is_pool else None,
                'individual': derived_sample["biosample__individual_id"] if not is_pool else None,
                'container': sample["container_id"],
                'coordinates': sample["coordinates"],
                'sample_kind': derived_sample["sample_kind_id"] if not is_pool or (is_pool and not is_library) else "POOL",
                'is_library': is_library,
                'is_pool': is_pool,
                'project': derived_sample["project_id"] if not is_pool else None,
                'process_measurements': process_measurements,
                'tissue_source': derived_sample["tissue_source_id"] if not is_pool else None,
                'creation_date': sample["creation_date"],
                'collection_site': derived_sample["biosample__collection_site"] if not is_pool else None,
                'experimental_group': derived_sample["experimental_group"] if not is_pool else None,
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


def fetch_library_data(ids: List[int] =[], queryset=None, query_params=None) -> List:
    """
    Function used to replace the library serializer across various viewsets.

    Args:
        ids: List of ids to select specific libraries. Defaults to [].
        queryset: When called from sample viewset, you can provide the viewset prefiltered queryset. Defaults to None.
        query_params: You can provide the query params for additional data formatting. Defaults to None.

    Returns:
        Returns a list of serialized data dictionary (samples)
    """
    if queryset is None:
        queryset = Sample.objects.select_related("container").all().distinct()

    if query_params is not None:
        limit = int(query_params.get('limit', REST_FRAMEWORK["PAGE_SIZE"]))
        offset = int(query_params.get('offset', 0))

    # No filtering for empty ids list otherwise use most effective selector
    if len(ids) == 1:
        queryset.filter(id=ids[0])
    elif len(ids) > 1:
        queryset.filter(id__in=ids)

    # Keep only libraries
    queryset = queryset.filter(derived_samples__library__isnull=False)

    libraries_queryset = queryset.annotate(
        first_derived_sample=Subquery(
            DerivedBySample.objects
            .filter(sample=OuterRef("pk"))
            .values_list("derived_sample", flat=True)[:1]
        )
    )
    library_values_queryset = (
        libraries_queryset
        .annotate(derived_count=Count("derived_samples"))
        [offset:offset+limit]
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
            'derived_count',
            'first_derived_sample',
        )
    )

    if not libraries_queryset:
        return [] # Do not lose time processing data for an empty queryset
    else:
        samples = { s["id"]: s for s in library_values_queryset }
        derived_sample_ids = [sample_values["first_derived_sample"]for sample_values in library_values_queryset]
        derived_sample_values_queryset = (
            DerivedSample.objects
            .filter(id__in=derived_sample_ids)
            .values(
                "id",
                "project_id",
                "biosample_id",
                "library__library_type__name",
                "library__platform__name",
                "library__library_size",
                "library__index__id",
            )
        )
        derived_samples = { ds["id"]: ds for ds in derived_sample_values_queryset }

        serialized_data = []
        for sample in samples.values():
            derived_sample = derived_samples[sample["first_derived_sample"]]
            is_pool = sample["derived_count"] > 1
            concentration_nm = None
            if sample["concentration"] is not None:
                concentration_nm, _, _ = convert_library_concentration_from_ngbyul_to_nm(Sample.objects.get(id=sample["id"]),
                                                                                         sample["concentration"])
            data = {
                'id': sample["id"],
                'biosample_id': derived_sample["biosample_id"] if not is_pool else None,
                'name': sample["name"],
                'volume': sample["volume"],
                'depleted': sample["depleted"],
                'concentration_ng_ul': sample["concentration"],
                'concentration_nm': concentration_nm,
                'quantity_ng': sample["concentration"] * sample["volume"] if sample["concentration"] else None,
                'container': sample["container_id"],
                'coordinates': sample["coordinates"],
                'is_pool': is_pool,
                'project': derived_sample["project_id"] if not is_pool else None,
                'creation_date': sample["creation_date"],
                'quality_flag': sample["quality_flag"],
                'quantity_flag': sample["quantity_flag"],
                'library_type': derived_sample["library__library_type__name"],
                'platform': derived_sample["library__platform__name"],
                'library_size': derived_sample["library__library_size"] if not is_pool else None,
                'index': derived_sample["library__index__id"] if not is_pool else None
            }
            serialized_data.append(data)
        return serialized_data

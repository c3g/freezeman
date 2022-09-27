
import imp
import json
from typing import List
from collections import defaultdict
from django.db.models import OuterRef, Subquery, Count, Prefetch, Q, ExpressionWrapper, BooleanField, Exists

from fms.settings import REST_FRAMEWORK
from fms_core.models import Sample, DerivedBySample, DerivedSample, SampleLineage, ProcessMeasurement, Project
from fms_core.services.library import convert_library_concentration_from_ngbyul_to_nm

from ..utils import make_generator, decimal_rounded_to_precision

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

    limit = None
    offset = None

    # No filtering for empty ids list otherwise use most effective selector
    if len(ids) == 1:
        queryset = queryset.filter(id=ids[0])
    elif len(ids) > 1:
        queryset = queryset.filter(id__in=ids)
    elif query_params is not None:
        limit = int(query_params.get('limit', REST_FRAMEWORK["PAGE_SIZE"]))
        offset = int(query_params.get('offset', 0))

    samples_queryset = queryset.annotate(
        first_derived_sample=Subquery(
            DerivedBySample.objects
            .filter(sample=OuterRef("pk"))
            .values_list("derived_sample", flat=True)[:1]
        )
    )

    # Annotate sample queryset
    samples_queryset = samples_queryset.annotate(derived_count=Count("derived_samples"))
    if offset is not None and limit is not None:
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
                "sample_kind__id",
                "tissue_source__id",
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
                'sample_kind': derived_sample["sample_kind__id"] if not is_pool or (is_pool and not is_library) else None,
                'is_library': is_library,
                'is_pool': is_pool,
                'project': derived_sample["project_id"] if not is_pool else None,
                'process_measurements': process_measurements,
                'tissue_source': derived_sample["tissue_source__id"] if not is_pool else None,
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


def fetch_export_sample_data(ids: List[int] =[], queryset=None, query_params=None) -> List:
    """
    Function used to replace the sample serializer when exporting data.

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

    # No filtering for empty ids list otherwise use most effective selector
    if len(ids) == 1:
        queryset = queryset.filter(id=ids[0])
    elif len(ids) > 1:
        queryset = queryset.filter(id__in=ids)

    samples_queryset = queryset.annotate(
        first_derived_sample=Subquery(
            DerivedBySample.objects
            .filter(sample=OuterRef("pk"))
            .values_list("derived_sample", flat=True)[:1]
        )
    )

    # full location
    sample_ids = tuple(samples_queryset.values_list('id', flat=True))
    samples_with_full_location = Sample.objects.raw('''WITH RECURSIVE container_hierarchy(id, parent, coordinates, full_location) AS (                                                   
                                                            SELECT container.id, container.location_id, container.coordinates, container.barcode::varchar || ' (' || container.kind::varchar || ') '
                                                            FROM fms_core_container AS container 
                                                            WHERE container.location_id IS NULL

                                                            UNION ALL

                                                            SELECT container.id, container.location_id, container.coordinates, container.barcode::varchar || ' (' || container.kind::varchar || ') ' || 
                                                            CASE 
                                                            WHEN (container.coordinates = '') THEN ''
                                                            ELSE 'at ' || container.coordinates::varchar || ' '
                                                            END

                                                            || 'in ' ||container_hierarchy.full_location::varchar
                                                            FROM container_hierarchy
                                                            JOIN fms_core_container AS container  ON container_hierarchy.id=container.location_id
                                                            ) 

                                                            SELECT sample.id AS id, full_location FROM container_hierarchy JOIN fms_core_sample AS sample ON sample.container_id=container_hierarchy.id 
                                                            WHERE sample.id IN  %s;''', params=[sample_ids])

    location_by_sample = {sample.id: sample.full_location for sample in samples_with_full_location }

    sample_values_queryset = (
        samples_queryset
        .annotate(
            is_library=Exists(DerivedSample.objects.filter(pk=OuterRef("first_derived_sample")).filter(library__isnull=False)),
        )
        .values(
            'id',
            'name',
            'container__id',
            'container__kind',
            'container__name',
            'container__barcode',
            'coordinates',
            'container__location__barcode',
            'container__coordinates',
            'volume',
            'concentration',
            'creation_date',
            'quality_flag',
            'quantity_flag',
            'depleted',
            'comment',
            'is_library',
            'first_derived_sample',
            'projects',
        )
    )
    samples = { s["id"]: s for s in sample_values_queryset }

    project_ids = sample_values_queryset.values_list("projects", flat=True)
    project_values_queryset = Project.objects.filter(id__in=project_ids).values("id", "name")
    projects = { p["id"]: p for p in project_values_queryset }

    derived_sample_ids = sample_values_queryset.values_list("first_derived_sample", flat=True)
    derived_sample_values_queryset = (
        DerivedSample
        .objects
        .filter(id__in=derived_sample_ids)
        .values(
            "id",
            "biosample__id",
            "biosample__alias",
            "sample_kind__name",
            "tissue_source__name",
            "biosample__collection_site",
            "experimental_group",
            "biosample__individual__name",
            "biosample__individual__alias",
            'biosample__individual__sex',
            'biosample__individual__taxon__name',
            'biosample__individual__cohort',
            'biosample__individual__father__name',
            'biosample__individual__mother__name',
            'biosample__individual__pedigree',
        )
    )
    derived_samples = { ds["id"]: ds for ds in derived_sample_values_queryset }

    serialized_data = []
    for sample in samples.values():
        derived_sample = derived_samples[sample["first_derived_sample"]]
        project_names = [projects[p]["name"] for p in make_generator(sample["projects"])]

        data = {
            'sample_id': sample["id"],
            'sample_name': sample["name"],
            'biosample_id': derived_sample["biosample__id"],
            'alias': derived_sample["biosample__alias"],
            'sample_kind': derived_sample["sample_kind__name"],
            'tissue_source': derived_sample["tissue_source__name"] or "",
            'container': sample["container__id"],
            'container_kind': sample["container__kind"],
            'container_name': sample["container__name"],
            'container_barcode': sample["container__barcode"],
            'coordinates': sample["coordinates"],
            'location_barcode': sample["container__location__barcode"] or "",
            'location_coord': sample["container__coordinates"] or "",
            'container_full_location': location_by_sample[sample["id"]] or "",
            'current_volume': sample["volume"],
            'concentration': sample["concentration"],
            'creation_date': sample["creation_date"],
            'collection_site': derived_sample["biosample__collection_site"],
            'experimental_group': json.dumps(derived_sample["experimental_group"]),
            'individual_name': derived_sample["biosample__individual__name"] or "",
            'individual_alias': derived_sample["biosample__individual__alias"] or "",
            'sex': derived_sample["biosample__individual__sex"] or "",
            'taxon': derived_sample["biosample__individual__taxon__name"] or "",
            'cohort': derived_sample["biosample__individual__cohort"] or "",
            'father_name': derived_sample["biosample__individual__father__name"] or "",
            'mother_name': derived_sample["biosample__individual__mother__name"] or "",
            'pedigree': derived_sample["biosample__individual__pedigree"] or "",
            'quality_flag': ["Failed", "Passed"][sample["quality_flag"]] if sample["quality_flag"] is not None else None,
            'quantity_flag': ["Failed", "Passed"][sample["quantity_flag"]] if sample["quantity_flag"] is not None else None,
            'projects': ",".join(project_names),
            'depleted': ["No", "Yes"][sample["depleted"]],
            'is_library': sample["is_library"],
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

    limit = None
    offset = None

    # No filtering for empty ids list otherwise use most effective selector
    if len(ids) == 1:
        queryset = queryset.filter(id=ids[0])
    elif len(ids) > 1:
        queryset = queryset.filter(id__in=ids)
    elif query_params is not None:
        limit = int(query_params.get('limit', REST_FRAMEWORK["PAGE_SIZE"]))
        offset = int(query_params.get('offset', 0))

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
                'quantity_ng': decimal_rounded_to_precision(sample["concentration"] * sample["volume"]) if sample["concentration"] else None,
                'container': sample["container_id"],
                'coordinates': sample["coordinates"],
                'is_pool': is_pool,
                'project': derived_sample["project_id"] if not is_pool else None,
                'creation_date': sample["creation_date"],
                'quality_flag': sample["quality_flag"],
                'quantity_flag': sample["quantity_flag"],
                'library_type': derived_sample["library__library_type__name"] if not is_pool else None, 
                'platform': derived_sample["library__platform__name"],
                'library_size': derived_sample["library__library_size"] if not is_pool else None,
                'index': derived_sample["library__index__id"] if not is_pool else None
            }
            serialized_data.append(data)
        return serialized_data


def fetch_export_library_data(ids: List[int] =[], queryset=None, query_params=None) -> List:
    """
    Function used to replace the library serializer when exporting data.

    Args:
        ids: List of ids to select specific libraries. Defaults to [].
        queryset: When called from sample viewset, you can provide the viewset prefiltered queryset. Defaults to None.
        query_params: You can provide the query params for additional data formatting. Defaults to None.

    Returns:
        Returns a list of serialized data dictionary (samples)
    """
    if queryset is None:
        queryset = Sample.objects.select_related("container").all().distinct()

    # No filtering for empty ids list otherwise use most effective selector
    if len(ids) == 1:
        queryset = queryset.filter(id=ids[0])
    elif len(ids) > 1:
        queryset = queryset.filter(id__in=ids)

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
        .values(
            'id',
            'name',
            'container__barcode',
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
                "project__name",
                "biosample_id",
                "library__library_type__name",
                "library__platform__name",
                "library__library_size",
                "library__index__name",
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
                'quantity_ng': decimal_rounded_to_precision(sample["concentration"] * sample["volume"]) if sample["concentration"] else None,
                'container': sample["container__barcode"],
                'coordinates': sample["coordinates"],
                'is_pool': is_pool,
                'project': derived_sample["project__name"] if not is_pool else None,
                'creation_date': sample["creation_date"],
                'quality_flag': ["Failed", "Passed"][sample["quality_flag"]] if sample["quality_flag"] is not None else None,
                'quantity_flag': ["Failed", "Passed"][sample["quantity_flag"]] if sample["quantity_flag"] is not None else None,
                'library_type': derived_sample["library__library_type__name"] if not is_pool else None,
                'platform': derived_sample["library__platform__name"],
                'library_size': derived_sample["library__library_size"] if not is_pool else None,
                'index': derived_sample["library__index__name"] if not is_pool else None
            }
            serialized_data.append(data)
        return serialized_data
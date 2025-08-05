
import json
import datetime
from typing import List, Tuple
from collections import defaultdict
from django.db.models import Q, ExpressionWrapper, BooleanField

from fms.settings import REST_FRAMEWORK
from fms_core.models import Sample, DerivedSample, SampleLineage, ProcessMeasurement, SampleMetadata, DerivedBySample, Project
from fms_core.services.library import convert_library_concentration_from_ngbyul_to_nm

from ..utils import decimal_rounded_to_precision

class FetchData:
    """
    Mixin used to replace the serializer across various viewsets.
    """
    fetch_limit = None
    fetch_offset = None

    def fetch_data(self, ids: List[int] =[]) -> Tuple[List, int]:
        """
        Abstract function to overload to produce serialized data for automated processing.

            Args:
                self: base_class(viewset) + fetch_data
                ids: List of ids to select specific objects. Defaults to [].

            Returns:
                Returns (None, None), overload to get a list and count
        """
        # No special filtering for empty ids list otherwise get only the selected ids objects
        if len(ids) > 0:
            self.queryset = self.queryset.filter(id__in=ids)
        # pagination params
        self.fetch_limit = int(self.request.query_params.get('limit', REST_FRAMEWORK["PAGE_SIZE"]))
        self.fetch_offset = int(self.request.query_params.get('offset', 0))

        return (None, None) # abstract function, must be overloaded. call base function for initialization
        
    def fetch_export_data(self, ids: List[int] =[]) -> Tuple[List, int]:
        """
        Abstract function to overload to produce serialized data for user consumption

        Args:
            self: base_class(viewset) + fetch_data
            ids: List of ids to select specific objects. Defaults to [].

        Returns:
            Returns None, overload to get a list
        """
         # No special filtering for empty ids list otherwise get only the selected ids objects
        if len(ids) > 0:
            self.queryset = self.queryset.filter(id__in=ids)

        return None # abstract function, must be overloaded. call base function for initialization


#####################################################################################################################################################


class FetchSampleData(FetchData):
    """
    Derived class specialized in fetching sample data.

    Args:
        fetch_data: base class
    """

    def fetch_data(self, ids: List[int] =[]) -> Tuple[List, int]:
        """
        Function used to replace the sample serializer across various viewsets.

        Args:
            self: base_class(viewset) + fetch_data
            ids: List of ids to select specific samples. Defaults to [].

        Returns:
            Returns a tuple of a list of serialized data dictionary (samples) and the count before pagination
        """
        super().fetch_data(ids) # Initialize queryset by calling base abstract function
        self.queryset = self.queryset.values('id')

        count = self.queryset.count() # Get count after value to have rows merged but before paging to have complete count

        self.queryset = self.filter_queryset(self.get_queryset())
        if len(ids) > 0:
            self.queryset = self.queryset.filter(id__in=ids)

        self.queryset = self.queryset.values(
            'id',
            'name',
            'container_id',
            'coordinate_id',
            'volume',
            'concentration',
            'fragment_size',
            'creation_date',
            'quality_flag',
            'quantity_flag',
            'identity_flag',
            'depleted',
            'comment',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
            'deleted',
        )

        if self.fetch_limit is not None and self.fetch_offset is not None:
            self.queryset = self.queryset[self.fetch_offset:self.fetch_offset+self.fetch_limit] # page the queryset

        if not self.queryset:
            return ([], 0) # Do not lose time processing data for an empty queryset
        else:
            samples = {s["id"]: s for s in self.queryset}
            samples_ids = samples.keys() 
            derived_by_sample_values_queryset = (
                DerivedBySample.objects
                .filter(sample_id__in=samples_ids)
                .annotate(is_library=ExpressionWrapper(Q(derived_sample__library__isnull=False), output_field=BooleanField()))
                .select_related("derived_sample", "derived_sample__biosample")
                .values(
                    "id",
                    "sample_id",
                    "is_library",
                    "project_id",
                    "derived_sample__biosample_id",
                    "derived_sample__biosample__alias",
                    "derived_sample__sample_kind_id",
                    "derived_sample__tissue_source_id",
                    "derived_sample__biosample__collection_site",
                    "derived_sample__experimental_group",
                    "derived_sample__biosample__individual_id",
                )
            )

            derived_by_samples = defaultdict(list)
            for dbs in derived_by_sample_values_queryset:
                derived_by_samples[dbs["sample_id"]].append(dbs)

            # Building subquery Process measurement
            pms = ProcessMeasurement.objects.filter(source_sample_id__in=samples_ids).values("source_sample_id", "id")
            pms_by_sample = defaultdict(list)
            for pm in pms:
                pms_by_sample[pm["source_sample_id"]].append(pm["id"])

            # Building subquery child_of
            samples_parent = SampleLineage.objects.filter(child__in=samples_ids) \
                                                  .values("child_id", "parent_id",)
            childs_of = {}
            for sample_parent in samples_parent:
                childs_of[sample_parent["child_id"]] = sample_parent["parent_id"]

            # Checking for extracted_from
            samples_extracted_from = samples_parent.filter(process_measurement__process__protocol__name="Extraction")
            extract_by_sample = {}
            for extracted in samples_extracted_from:
                extract_by_sample[extracted["child_id"]] = extracted["parent_id"]

            serialized_data = []
            for sample in samples.values():
                derived_by_sample = derived_by_samples[sample["id"]][0]
                is_pool = len(derived_by_samples[sample["id"]]) > 1
                is_library = derived_by_sample["is_library"]
                process_measurements = pms_by_sample[sample["id"]]
                child_of = childs_of.get(sample["id"], None)
                extracted_from = extract_by_sample.get(sample["id"], None)
                data = {
                    'id': sample["id"],
                    'biosample_id': derived_by_sample["derived_sample__biosample_id"] if not is_pool else None,
                    'name': sample["name"],
                    'alias': derived_by_sample["derived_sample__biosample__alias"] if not is_pool else None,
                    'volume': sample["volume"],
                    'depleted': sample["depleted"],
                    'concentration': sample["concentration"],
                    'fragment_size': sample["fragment_size"],
                    'child_of': child_of if not is_pool else None,
                    'extracted_from': extracted_from if not is_pool else None,
                    'individual': derived_by_sample["derived_sample__biosample__individual_id"] if not is_pool or not is_library else None,
                    'container': sample["container_id"],
                    'coordinate': sample["coordinate_id"],
                    'sample_kind': derived_by_sample["derived_sample__sample_kind_id"] if not is_pool or not is_library else None,
                    'is_library': is_library,
                    'is_pool': is_pool,
                    'project': derived_by_sample["project_id"] if not is_pool or not is_library else None,
                    'process_measurements': process_measurements,
                    'tissue_source': derived_by_sample["derived_sample__tissue_source_id"] if not is_pool else None,
                    'creation_date': sample["creation_date"],
                    'collection_site': derived_by_sample["derived_sample__biosample__collection_site"] if not is_pool else None,
                    'experimental_group': derived_by_sample["derived_sample__experimental_group"] if not is_pool else None,
                    'quality_flag': sample["quality_flag"],
                    'quantity_flag': sample["quantity_flag"],
                    'identity_flag': sample["identity_flag"],
                    'created_by': sample["created_by"],
                    'created_at': sample["created_at"],
                    'updated_by': sample["updated_by"],
                    'updated_at': sample["updated_at"],
                    'deleted': sample["deleted"],
                    'comment': sample["comment"],
                    'derived_samples_count': len(derived_by_samples[sample["id"]])
                }
                serialized_data.append(data)
            return (serialized_data, count)


    def fetch_export_data(self, ids: List[int] =[]) -> Tuple[List, int]:
        """
        Function used to replace the sample serializer when exporting data.

        Args:
            self: base_class(viewset) + fetch_data
            ids: List of ids to select specific samples. Defaults to [].

        Returns:
            Returns a list of serialized data dictionary (samples)
        """
        super().fetch_export_data(ids) # Initialize queryset by calling base abstract function

        # full location
        sample_ids = tuple(self.queryset.values_list('id', flat=True))
        samples_with_full_location = tuple()
        samples_with_site = tuple()
        if sample_ids: # Query crashes on empty tuple
            samples_with_full_location = Sample.objects.raw('''WITH RECURSIVE container_hierarchy(id, parent, coordinate_id, coordinates, full_location) AS (                                                   
                                                               SELECT container.id, container.location_id, coordinate.id, coordinate.name, container.barcode::varchar || ' (' || container.kind::varchar || ') '
                                                               FROM fms_core_container AS container
                                                               LEFT OUTER JOIN fms_core_coordinate AS coordinate ON container.coordinate_id=coordinate.id
                                                               WHERE container.location_id IS NULL

                                                               UNION ALL

                                                               SELECT container.id, container.location_id, coordinate.id, coordinate.name, container.barcode::varchar || ' (' || container.kind::varchar || ') ' || 
                                                               CASE 
                                                               WHEN (container.coordinate_id IS NULL) THEN ''
                                                               ELSE 'at ' || coordinate.name::varchar || ' '
                                                               END

                                                               || 'in ' ||container_hierarchy.full_location::varchar
                                                               FROM container_hierarchy
                                                               JOIN fms_core_container AS container ON container_hierarchy.id=container.location_id
                                                               LEFT OUTER JOIN fms_core_coordinate AS coordinate ON container.coordinate_id=coordinate.id
                                                               ) 

                                                               SELECT sample.id AS id, full_location FROM container_hierarchy JOIN fms_core_sample AS sample ON sample.container_id=container_hierarchy.id 
                                                               WHERE sample.id IN  %s;''', params=[sample_ids])
            
            samples_with_site = Sample.objects.raw('''WITH RECURSIVE container_hierarchy(id, parent, coordinate_id, site_name) AS (
                                                      SELECT container.id, container.location_id, coordinate.id, container.barcode::varchar
                                                      FROM fms_core_container AS container
                                                      LEFT OUTER JOIN fms_core_coordinate AS coordinate ON container.coordinate_id=coordinate.id
                                                      WHERE (container.location_id IS null and container.kind='site')

                                                      UNION ALL

                                                      SELECT container.id, container.location_id, coordinate.id, container_hierarchy.site_name
                                                      FROM container_hierarchy
                                                      JOIN fms_core_container AS container ON container_hierarchy.id=container.location_id
                                                      LEFT OUTER JOIN fms_core_coordinate AS coordinate ON container.coordinate_id=coordinate.id
                                                      )

                                                      SELECT sample.id AS id, site_name FROM container_hierarchy JOIN fms_core_sample AS sample ON sample.container_id=container_hierarchy.id 
                                                      WHERE sample.id IN  %s;''', params=[sample_ids])

        location_by_sample = {sample.id: sample.full_location for sample in samples_with_full_location }
        site_by_sample = {sample.id: sample.site_name for sample in samples_with_site }

        self.queryset = self.filter_queryset(self.get_queryset())
        if len(ids) > 0:
            self.queryset = self.queryset.filter(id__in=ids)

        self.queryset = self.queryset.values(
            'id',
            'name',
            'container__id',
            'container__kind',
            'container__name',
            'container__barcode',
            'coordinate__name',
            'container__location__barcode',
            'container__coordinate__name',
            'volume',
            'concentration',
            'fragment_size',
            'creation_date',
            'quality_flag',
            'quantity_flag',
            'identity_flag',
            'depleted',
            'comment',
        )
        samples = {s["id"]: s for s in self.queryset}

        samples_ids = samples.keys() 
        derived_by_sample_values_queryset = (
            DerivedBySample.objects
            .filter(sample_id__in=samples_ids)
            .annotate(is_library=ExpressionWrapper(Q(derived_sample__library__isnull=False), output_field=BooleanField()))
            .select_related("derived_sample", "derived_sample__biosample", "derived_sample__biosample__individual", "derived_sample__sample_kind__name", "derived_sample__tissue_source__name")
            .values(
                "id",
                "sample_id",
                "is_library",
                "project_id",
                "derived_sample__biosample_id",
                "derived_sample__biosample__alias",
                "derived_sample__sample_kind__name",
                "derived_sample__tissue_source__name",
                "derived_sample__biosample__collection_site",
                "derived_sample__experimental_group",
                "derived_sample__biosample__individual__name",
                "derived_sample__biosample__individual__alias",
                "derived_sample__biosample__individual__sex",
                "derived_sample__biosample__individual__taxon__name",
                "derived_sample__biosample__individual__cohort",
                "derived_sample__biosample__individual__father__name",
                "derived_sample__biosample__individual__mother__name",
                "derived_sample__biosample__individual__pedigree",
            )
        )
        derived_by_samples = defaultdict(list)
        projects_ids = set()
        for dbs in derived_by_sample_values_queryset:
            derived_by_samples[dbs["sample_id"]].append(dbs)
            if dbs["project_id"] is not None:
                projects_ids.add(dbs["project_id"])

        projects_ids = list(projects_ids)
        projects_values_queryset = Project.objects.filter(id__in=projects_ids).values("id", "name")
        project_name_by_id = {prj["id"]: prj["name"] for prj in projects_values_queryset}

        serialized_data = []
        if not samples:
            serialized_data.append({}) # Allow the returned csv file to be named instead of random name.
        for sample in samples.values():
            derived_by_sample = derived_by_samples[sample["id"]][0]
            is_library = derived_by_sample["is_library"]
            is_pool = len(derived_by_samples[sample["id"]]) > 1
            data = {
                'sample_id': sample["id"],
                'sample_name': sample["name"],
                'biosample_id': derived_by_sample["derived_sample__biosample_id"] if not is_pool else None,
                'alias': derived_by_sample["derived_sample__biosample__alias"] if not is_pool or not is_library else None,
                'sample_kind': derived_by_sample["derived_sample__sample_kind__name"] if not is_pool or not is_library else "POOL",
                'tissue_source': derived_by_sample["derived_sample__tissue_source__name"] if not is_pool else None,
                'container': sample["container__id"],
                'container_kind': sample["container__kind"],
                'container_name': sample["container__name"],
                'container_barcode': sample["container__barcode"],
                'coordinates': sample["coordinate__name"],
                'location_barcode': sample["container__location__barcode"] or "",
                'location_coord': sample["container__coordinate__name"] or "",
                'container_full_location': location_by_sample[sample["id"]] or "",
                'site': site_by_sample.get(sample["id"], ""),
                'current_volume': sample["volume"],
                'concentration': sample["concentration"],
                'fragment_size': sample["fragment_size"],
                'creation_date': sample["creation_date"],
                'collection_site': derived_by_sample["derived_sample__biosample__collection_site"] if not is_pool else None,
                'experimental_group': json.dumps(derived_by_sample["derived_sample__experimental_group"]) if not is_pool or not is_library else None,
                'individual_name': derived_by_sample["derived_sample__biosample__individual__name"] if not is_pool or not is_library else None,
                'individual_alias': derived_by_sample["derived_sample__biosample__individual__alias"] if not is_pool or not is_library else None,
                'sex': derived_by_sample["derived_sample__biosample__individual__sex"] if not is_pool or not is_library else None,
                'taxon': derived_by_sample["derived_sample__biosample__individual__taxon__name"] if not is_pool or not is_library else None,
                'cohort': derived_by_sample["derived_sample__biosample__individual__cohort"] if not is_pool or not is_library else None,
                'father_name': derived_by_sample["derived_sample__biosample__individual__father__name"] if not is_pool or not is_library else None,
                'mother_name': derived_by_sample["derived_sample__biosample__individual__mother__name"] if not is_pool or not is_library else None,
                'pedigree': derived_by_sample["derived_sample__biosample__individual__pedigree"] if not is_pool or not is_library else None,
                'quality_flag': ["Failed", "Passed"][sample["quality_flag"]] if sample["quality_flag"] is not None else None,
                'quantity_flag': ["Failed", "Passed"][sample["quantity_flag"]] if sample["quantity_flag"] is not None else None,
                'identity_flag': ["Failed", "Passed"][sample["identity_flag"]] if sample["identity_flag"] is not None else None,
                'project': project_name_by_id[derived_by_sample["project_id"]] if not is_pool and derived_by_sample["project_id"] is not None else None,
                'depleted': ["No", "Yes"][sample["depleted"]],
                'is_library': is_library,
                'comment': sample["comment"],
                "derived_samples_counts": len(derived_by_samples[sample["id"]])
            }
            serialized_data.append(data)

        return serialized_data

    def fetch_export_metadata(self, ids: List[int] =[]) -> Tuple[List, int]:
        """
        Function to retrieve the sample metadata to export. 

        Args:
            self: base_class(viewset) + fetch_data
            ids: List of ids to select specific samples. Defaults to [].

        Returns:
            Returns a list of serialized sample metadata dictionary and a tuple of the names of the metadata for rendering purposes
        """

        super().fetch_export_data(ids) # Initialize queryset by calling base abstract function

        self.queryset = self.queryset.values(
            'id',
            'name',
            'container__name',
            'container__barcode',
            'coordinate__name',
            'derived_samples'
        )
        samples_by_derived = defaultdict(list)
        for s in self.queryset:
            if s["derived_samples"] is list:
                for derived_sample in s["derived_samples"]:
                    samples_by_derived[derived_sample].append(s)
            else:
                samples_by_derived[s["derived_samples"]].append(s)

        derived_sample_values_queryset = (
            DerivedSample.objects
            .filter(id__in=samples_by_derived.keys())
            .values(
                'id',
                'biosample__id',
                'biosample__alias',
            )
        )
        derived_samples = {ds["id"]: ds for ds in derived_sample_values_queryset}

        derived_by_sample_values_queryset = DerivedBySample.objects.all()
        cumulative_query = Q()
        for derived_sample_id, samples in samples_by_derived.items():
            for sample in samples:
                current_query = Q(derived_sample_id=derived_sample_id)
                current_query.add(Q(sample_id=sample["id"]), Q.AND)
                cumulative_query.add(current_query, Q.OR)
        derived_by_sample_values = derived_by_sample_values_queryset.filter(cumulative_query).values('id', 'derived_sample_id', 'sample_id', 'project__name').distinct()

        derived_by_samples = defaultdict(dict)
        for derived_by_sample in derived_by_sample_values:
            derived_by_samples[derived_by_sample["derived_sample_id"]][derived_by_sample["sample_id"]] = derived_by_sample["project__name"]

        biosample_ids = derived_sample_values_queryset.values_list('biosample__id', flat=True)
        metadata_queryset = SampleMetadata.objects.filter(biosample_id__in=biosample_ids)
        metadata_obj = metadata_queryset.values('biosample','name', 'value')

        metadata_per_biosample = {}
        for metadata in metadata_obj:
            biosample = metadata['biosample']
            if biosample in metadata_per_biosample.keys():
                metadata_per_biosample[biosample].append(metadata)
            else:
                metadata_per_biosample[biosample] = [metadata]

        serialized_data = []
        if not samples_by_derived:
            serialized_data.append({}) # Allow the returned csv file to be named instead of random name.
        # For the renderer context
        metadata_names = []
        for derived_sample_id, samples in samples_by_derived.items():
            for sample in samples:
                derived_sample = derived_samples[derived_sample_id]
                # Prevents crashing if sample has no metadata
                biosample_id = derived_sample["biosample__id"]
                metadata = metadata_per_biosample[biosample_id] if biosample_id in metadata_per_biosample else None
                data = {
                    'alias': derived_sample["biosample__alias"],
                    'biosample_id': biosample_id ,
                    'sample_name': sample["name"],
                    'container_name': sample["container__name"],
                    'container_barcode': sample["container__barcode"],
                    'coordinates': sample["coordinate__name"],
                    'project': derived_by_samples[derived_sample_id][sample["id"]],
                    **(dict((item["name"], item["value"]) for item in metadata) if metadata else dict())
                }

                metadata_names.extend([data_key for data_key in data.keys() if data_key not in metadata_names])
                serialized_data.append(data)

        return (metadata_names, serialized_data)


#####################################################################################################################################################


class FetchLibraryData(FetchData):
    """
    Derived class specialized in fetching library data.

    Args:
        fetch_data: base class

    """

    def fetch_data(self, ids: List[int] =[]) -> Tuple[List, int]:
        """
        Function used to replace the library serializer across various viewsets.

        Args:
            self: base_class(viewset) + fetch_data
            ids: List of ids to select specific libraries. Defaults to [].

        Returns:
            Returns a tuple of a list of serialized data dictionary (libraries) and the count before pagination
        """

        super().fetch_data(ids) # Initialize queryset by calling base abstract function

        self.queryset = self.queryset.values('id')
        count = self.queryset.count() # Get count after value to have rows merged but before paging to have complete count
        
        self.queryset = self.filter_queryset(self.get_queryset())
        if len(ids) > 0:
            self.queryset = self.queryset.filter(id__in=ids)

        self.queryset = self.queryset.values(
            'id',
            'name',
            'container_id',
            'coordinate_id',
            'volume',
            'concentration',
            'fragment_size',
            'quantity_ng',
            'creation_date',
            'quality_flag',
            'quantity_flag',
            'identity_flag',
            'depleted',
        )

        if self.fetch_limit is not None and self.fetch_offset is not None:
            self.queryset = self.queryset[self.fetch_offset:self.fetch_offset+self.fetch_limit] # page the queryset

        if not self.queryset:
            return ([], 0) # Do not lose time processing data for an empty queryset
        else:
            samples = {s["id"]: s for s in self.queryset}

            samples_ids = samples.keys() 
            derived_by_sample_values_queryset = (
                DerivedBySample.objects
                .filter(sample_id__in=samples_ids)
                .select_related("derived_sample", "derived_sample__library", "derived_sample__library__library_selection", "derived_sample__library__library_type__name")
                .values(
                    "id",
                    "sample_id",
                    "project_id",
                    "derived_sample__biosample_id",
                    "derived_sample__library__library_type__name",
                    "derived_sample__library__platform__name",
                    "derived_sample__library__index_id",
                    "derived_sample__library__library_selection__name",
                    "derived_sample__library__library_selection__target",
                )
            )
            derived_by_samples = defaultdict(list)
            for dbs in derived_by_sample_values_queryset:
                derived_by_samples[dbs["sample_id"]].append(dbs)

            serialized_data = []
            for sample in samples.values():
                derived_by_sample = derived_by_samples[sample["id"]][0]
                is_pool = len(derived_by_samples[sample["id"]]) > 1
                concentration_nm = None
                if sample["concentration"] is not None:
                    concentration_nm, _, _ = convert_library_concentration_from_ngbyul_to_nm(Sample.objects.get(id=sample["id"]),
                                                                                             sample["concentration"])
                data = {
                    'id': sample["id"],
                    'biosample_id': derived_by_sample["derived_sample__biosample_id"] if not is_pool else None,
                    'name': sample["name"],
                    'volume': sample["volume"],
                    'depleted': sample["depleted"],
                    'concentration': sample["concentration"],
                    'concentration_nm': concentration_nm,
                    'quantity_ng': decimal_rounded_to_precision(sample["quantity_ng"]) if sample["concentration"] else None,
                    'container': sample["container_id"],
                    'coordinate': sample["coordinate_id"],
                    'is_pool': is_pool,
                    'project': derived_by_sample["project_id"] if not is_pool else None,
                    'creation_date': sample["creation_date"],
                    'quality_flag': sample["quality_flag"],
                    'quantity_flag': sample["quantity_flag"],
                    'identity_flag': sample["identity_flag"],
                    'library_type': derived_by_sample["derived_sample__library__library_type__name"] if not is_pool else None,
                    'platform': derived_by_sample["derived_sample__library__platform__name"],
                    'library_size': sample["fragment_size"],
                    'index': derived_by_sample["derived_sample__library__index_id"] if not is_pool else None,
                    'library_selection': derived_by_sample["derived_sample__library__library_selection__name"] if not is_pool else None,
                    'library_selection_target': derived_by_sample["derived_sample__library__library_selection__target"] if not is_pool else None,
                    'derived_samples_count': len(derived_by_samples[sample["id"]])
                }
                serialized_data.append(data)
            return (serialized_data, count)


    def fetch_export_data(self, ids: List[int] =[]) -> Tuple[List, int]:
        """
        Function used to replace the library serializer when exporting data.

        Args:
            self: base_class(viewset) + fetch_data
            ids: List of ids to select specific libraries. Defaults to [].

        Returns:
            Returns a list of serialized data dictionary (libraries)
        """

        super().fetch_export_data(ids) # Initialize queryset by calling base abstract function

        self.queryset = self.queryset.values(
            'id',
            'name',
            'container__barcode',
            'coordinate__name',
            'volume',
            'concentration',
            'fragment_size',
            'quantity_ng',
            'creation_date',
            'quality_flag',
            'quantity_flag',
            'identity_flag',
            'depleted',
        )

        if not self.queryset:
            return [{}] # Do not lose time processing data for an empty queryset
        else:
            samples = {s["id"]: s for s in self.queryset}

            samples_ids = samples.keys() 
            derived_by_sample_values_queryset = (
                DerivedBySample.objects
                .filter(sample_id__in=samples_ids)
                .select_related("derived_sample",
                                "derived_sample__library",
                                "derived_sample__library__library_selection",
                                "derived_sample__library__library_type__name",
                                "derived_sample__library__index__name",
                                "derived_sample__library__platform__name",
                                )
                .values(
                    "id",
                    "sample_id",
                    "project_id",
                    "derived_sample__biosample_id",
                    "derived_sample__library__library_type__name",
                    "derived_sample__library__platform__name",
                    "derived_sample__library__index__name",
                    "derived_sample__library__library_selection__name",
                    "derived_sample__library__library_selection__target",
                )
            )
            derived_by_samples = defaultdict(list)
            projects_ids = set()
            for dbs in derived_by_sample_values_queryset:
                derived_by_samples[dbs["sample_id"]].append(dbs)
                if dbs["project_id"] is not None:
                    projects_ids.add(dbs["project_id"])

            projects_ids = list(projects_ids)
            projects_values_queryset = Project.objects.filter(id__in=projects_ids).values("id", "name")
            project_name_by_id = {prj["id"]: prj["name"] for prj in projects_values_queryset}

            serialized_data = []
            for sample in samples.values():
                derived_by_sample = derived_by_samples[sample["id"]][0]
                is_pool = len(derived_by_samples[sample["id"]]) > 1
                concentration_nm = None
                if sample["concentration"] is not None:
                    concentration_nm, _, _ = convert_library_concentration_from_ngbyul_to_nm(Sample.objects.get(id=sample["id"]),
                                                                                             sample["concentration"])
                data = {
                    'id': sample["id"],
                    'biosample_id': derived_by_samples["derived_sample__biosample_id"] if not is_pool else None,
                    'name': sample["name"],
                    'volume': sample["volume"],
                    'depleted': sample["depleted"],
                    'concentration_ng_ul': sample["concentration"],
                    'concentration_nm': concentration_nm,
                    'quantity_ng': decimal_rounded_to_precision(sample["quantity_ng"]) if sample["concentration"] else None,
                    'container': sample["container__barcode"],
                    'coordinates': sample["coordinate__name"],
                    'is_pool': is_pool,
                    'project': project_name_by_id[derived_by_sample["project_id"]] if not is_pool and derived_by_sample["project_id"] is not None else None,
                    'creation_date': sample["creation_date"],
                    'quality_flag': ["Failed", "Passed"][sample["quality_flag"]] if sample["quality_flag"] is not None else None,
                    'quantity_flag': ["Failed", "Passed"][sample["quantity_flag"]] if sample["quantity_flag"] is not None else None,
                    'identity_flag': ["Failed", "Passed"][sample["identity_flag"]] if sample["identity_flag"] is not None else None,
                    'library_type': derived_by_sample["derived_sample__library__library_type__name"] if not is_pool else None,
                    'platform': derived_by_sample["derived_sample__library__platform__name"],
                    'library_size': sample["fragment_size"],
                    'index': derived_by_sample["derived_sample__library__index__name"] if not is_pool else None,
                    'library_selection': derived_by_sample["derived_sample__library__library_selection__name"] if not is_pool else None,
                    'library_selection_target': derived_by_sample["derived_sample__library__library_selection__target"] if not is_pool else None,
                    'derived_samples_count': len(derived_by_samples[sample["id"]])
                }
                serialized_data.append(data)
            return serialized_data

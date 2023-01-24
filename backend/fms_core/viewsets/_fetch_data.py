
import json
from typing import List, Tuple
from collections import defaultdict
from django.db.models import Q, ExpressionWrapper, BooleanField

from fms.settings import REST_FRAMEWORK
from fms_core.models import Sample, DerivedSample, SampleLineage, ProcessMeasurement, SampleMetadata
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
        if len(ids) == 1:
            self.queryset = self.queryset.filter(id=ids[0])
        elif len(ids) > 1:
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
        if len(ids) == 1:
            self.queryset = self.queryset.filter(id=ids[0])
        elif len(ids) > 1:
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

        self.queryset = self.queryset.values(
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
            'count_derived_samples',
            'first_derived_sample',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
            'deleted',
        )

        count = self.queryset.count() # Get count after value to have rows merged but before paging to have complete count

        if self.fetch_limit is not None and self.fetch_offset is not None:
            self.queryset = self.queryset[self.fetch_offset:self.fetch_offset+self.fetch_limit] # page the queryset

        if not self.queryset:
            return ([], 0) # Do not lose time processing data for an empty queryset
        else:
            samples = {s["id"]: s for s in self.queryset}
            samples_ids = samples.keys() 
            first_derived_sample_ids = [sample_values["first_derived_sample"] for sample_values in self.queryset]
            derived_sample_values_queryset = (
                DerivedSample.objects
                .filter(id__in=first_derived_sample_ids)
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
            derived_samples = {ds["id"]: ds for ds in derived_sample_values_queryset}

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
                derived_sample = derived_samples[sample["first_derived_sample"]]
                is_pool = sample["count_derived_samples"] > 1
                is_library = derived_sample["is_library"]
                process_measurements = pms_by_sample[sample["id"]]
                child_of = childs_of.get(sample["id"], None)
                extracted_from = extract_by_sample.get(sample["id"], None)
                data = {
                    'id': sample["id"],
                    'biosample_id': derived_sample["biosample_id"] if not is_pool else None,
                    'name': sample["name"],
                    'alias': derived_sample["biosample__alias"] if not is_pool else None,
                    'volume': sample["volume"],
                    'depleted': sample["depleted"],
                    'concentration': sample["concentration"],
                    'child_of': child_of if not is_pool else None,
                    'extracted_from': extracted_from if not is_pool else None,
                    'individual': derived_sample["biosample__individual_id"] if not is_pool or not is_library else None,
                    'container': sample["container_id"],
                    'coordinates': sample["coordinates"],
                    'sample_kind': derived_sample["sample_kind__id"] if not is_pool or not is_library else None,
                    'is_library': is_library,
                    'is_pool': is_pool,
                    'project': derived_sample["project_id"] if not is_pool or not is_library else None,
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
        if sample_ids: # Query crashes on empty tuple
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

        self.queryset = self.queryset.values(
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
            'count_derived_samples',
            'first_derived_sample',
        )
        samples = {s["id"]: s for s in self.queryset}

        first_derived_sample_ids = self.queryset.values_list("first_derived_sample", flat=True)
        derived_sample_values_queryset = (
            DerivedSample.objects
            .filter(id__in=first_derived_sample_ids)
            .annotate(is_library=ExpressionWrapper(Q(library__isnull=False), output_field=BooleanField()))
            .values(
                "id",
                'is_library',
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
                'project__name',
            )
        )
        derived_samples = {ds["id"]: ds for ds in derived_sample_values_queryset}

        serialized_data = []
        if not samples:
            serialized_data.append({}) # Allow the returned csv file to be named instead of random name.
        for sample in samples.values():
            derived_sample = derived_samples[sample["first_derived_sample"]]
            is_library = derived_sample["is_library"]
            is_pool = sample["count_derived_samples"] > 1
            data = {
                'sample_id': sample["id"],
                'sample_name': sample["name"],
                'biosample_id': derived_sample["biosample__id"] if not is_pool else None,
                'alias': derived_sample["biosample__alias"] if not is_pool or not is_library else None,
                'sample_kind': derived_sample["sample_kind__name"] if not is_pool or not is_library else "POOL",
                'tissue_source': derived_sample["tissue_source__name"] if not is_pool else None,
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
                'collection_site': derived_sample["biosample__collection_site"] if not is_pool else None,
                'experimental_group': json.dumps(derived_sample["experimental_group"]) if not is_pool or not is_library else None,
                'individual_name': derived_sample["biosample__individual__name"] if not is_pool or not is_library else None,
                'individual_alias': derived_sample["biosample__individual__alias"] if not is_pool or not is_library else None,
                'sex': derived_sample["biosample__individual__sex"] if not is_pool or not is_library else None,
                'taxon': derived_sample["biosample__individual__taxon__name"] if not is_pool or not is_library else None,
                'cohort': derived_sample["biosample__individual__cohort"] if not is_pool or not is_library else None,
                'father_name': derived_sample["biosample__individual__father__name"] if not is_pool or not is_library else None,
                'mother_name': derived_sample["biosample__individual__mother__name"] if not is_pool or not is_library else None,
                'pedigree': derived_sample["biosample__individual__pedigree"] if not is_pool or not is_library else None,
                'quality_flag': ["Failed", "Passed"][sample["quality_flag"]] if sample["quality_flag"] is not None else None,
                'quantity_flag': ["Failed", "Passed"][sample["quantity_flag"]] if sample["quantity_flag"] is not None else None,
                'projects': derived_sample["project__name"] if not is_pool else None,
                'depleted': ["No", "Yes"][sample["depleted"]],
                'is_library': is_library,
                'comment': sample["comment"],
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
            Returns a list of serialized sample metadata dictionary
        """

        super().fetch_export_data(ids) # Initialize queryset by calling base abstract function

        self.queryset = self.queryset.values(
            'id',
            'name',
            'container__kind',
            'container__name',
            'container__barcode',
            'coordinates',
            'container__location__barcode',
            'container__coordinates',
            'count_derived_samples',
            'first_derived_sample',
        )
        samples = {s["id"]: s for s in self.queryset}

        first_derived_sample_ids = self.queryset.values_list("first_derived_sample", flat=True)
        derived_sample_values_queryset = (
            DerivedSample.objects
            .filter(id__in=first_derived_sample_ids)
            .annotate(is_library=ExpressionWrapper(Q(library__isnull=False), output_field=BooleanField()))
            .values(
                'id',
                'biosample__id',
                'biosample__alias',
                'project__name',
                'is_library',
            )
        )
        derived_samples = {ds["id"]: ds for ds in derived_sample_values_queryset}

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
        if not samples:
            serialized_data.append({}) # Allow the returned csv file to be named instead of random name.
        for sample in samples.values():
            derived_sample = derived_samples[sample["first_derived_sample"]]
            is_library = derived_sample["is_library"]
            is_pool = sample["count_derived_samples"] > 1
            metadata = metadata_per_biosample[derived_sample["biosample__id"]]
            
            data = {
                'sample_name': sample["name"],
                'biosample_id': derived_sample["biosample__id"] if not is_pool else None,
                'alias': derived_sample["biosample__alias"] if not is_pool or not is_library else None,
                'container_kind': sample["container__kind"],
                'container_name': sample["container__name"],
                'container_barcode': sample["container__barcode"],
                'coordinates': sample["coordinates"],
                'location_barcode': sample["container__location__barcode"] or "",
                'location_coord': sample["container__coordinates"] or "",
                'project': derived_sample["project__name"] if not is_pool else None,
                **dict((item["name"], item["value"]) for item in metadata)
            }
            serialized_data.append(data)

        return serialized_data


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

        self.queryset = self.queryset.values(
            'id',
            'name',
            'container_id',
            'coordinates',
            'volume',
            'concentration',
            'quantity_ng',
            'creation_date',
            'quality_flag',
            'quantity_flag',
            'depleted',
            'count_derived_samples',
            'first_derived_sample',
        )

        count = self.queryset.count() # Get count after value to have rows merged but before paging to have complete count
        
        if self.fetch_limit is not None and self.fetch_offset is not None:
            self.queryset = self.queryset[self.fetch_offset:self.fetch_offset+self.fetch_limit] # page the queryset

        if not self.queryset:
            return ([], 0) # Do not lose time processing data for an empty queryset
        else:
            samples = {s["id"]: s for s in self.queryset}
            first_derived_sample_ids = [sample_values["first_derived_sample"]for sample_values in self.queryset]
            derived_sample_values_queryset = (
                DerivedSample.objects
                .filter(id__in=first_derived_sample_ids)
                .values(
                    "id",
                    "project_id",
                    "biosample_id",
                    "library__library_type__name",
                    "library__platform__name",
                    "library__library_size",
                    "library__index__id",
                    "library__library_selection__name",
                    "library__library_selection__target",
                )
            )
            derived_samples = {ds["id"]: ds for ds in derived_sample_values_queryset}

            serialized_data = []
            for sample in samples.values():
                derived_sample = derived_samples[sample["first_derived_sample"]]
                is_pool = sample["count_derived_samples"] > 1
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
                    'concentration': sample["concentration"],
                    'concentration_nm': concentration_nm,
                    'quantity_ng': decimal_rounded_to_precision(sample["quantity_ng"]) if sample["concentration"] else None,
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
                    'index': derived_sample["library__index__id"] if not is_pool else None,
                    'library_selection': derived_sample["library__library_selection__name"] if not is_pool else None,
                    'library_selection_target': derived_sample["library__library_selection__target"] if not is_pool else None,
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
            'coordinates',
            'volume',
            'concentration',
            'quantity_ng',
            'creation_date',
            'quality_flag',
            'quantity_flag',
            'depleted',
            'count_derived_samples',
            'first_derived_sample',
        )

        if not self.queryset:
            return [{}] # Do not lose time processing data for an empty queryset
        else:
            samples = {s["id"]: s for s in self.queryset}
            first_derived_sample_ids = [sample_values["first_derived_sample"] for sample_values in self.queryset]
            derived_sample_values_queryset = (
                DerivedSample.objects
                .filter(id__in=first_derived_sample_ids)
                .values(
                    "id",
                    "project__name",
                    "biosample_id",
                    "library__library_type__name",
                    "library__platform__name",
                    "library__library_size",
                    "library__index__name",
                    "library__library_selection__name",
                    "library__library_selection__target",
                )
            )
            derived_samples = {ds["id"]: ds for ds in derived_sample_values_queryset}

            serialized_data = []
            for sample in samples.values():
                derived_sample = derived_samples[sample["first_derived_sample"]]
                is_pool = sample["count_derived_samples"] > 1
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
                    'quantity_ng': decimal_rounded_to_precision(sample["quantity_ng"]) if sample["concentration"] else None,
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
                    'index': derived_sample["library__index__name"] if not is_pool else None,
                    'library_selection': derived_sample["library__library_selection__name"] if not is_pool else None,
                    'library_selection_target': derived_sample["library__library_selection__target"] if not is_pool else None,
                }
                serialized_data.append(data)
            return serialized_data

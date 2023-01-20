from typing import Dict, List
from ._utils import _prefix_keys


FREE_TEXT_FILTERS = ["contains", "icontains", "startswith"]
CATEGORICAL_FILTERS = ["exact", "in"]
CATEGORICAL_FILTERS_LOOSE = [*CATEGORICAL_FILTERS, *FREE_TEXT_FILTERS]
FK_FILTERS = CATEGORICAL_FILTERS
PK_FILTERS = ["in"]
NULLABLE_FK_FILTERS = [*FK_FILTERS, "isnull"]
SCALAR_FILTERS = ["exact", "lt", "lte", "gt", "gte"]
DATE_FILTERS = [*SCALAR_FILTERS, "year", "month", "week", "week_day", "day"]

FiltersetFields = Dict[str, List[str]]

_container_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": FREE_TEXT_FILTERS,
    "barcode": FREE_TEXT_FILTERS,
    "kind": CATEGORICAL_FILTERS,
    "coordinates": FREE_TEXT_FILTERS,
    "comment": FREE_TEXT_FILTERS,
    "update_comment": FREE_TEXT_FILTERS,
    "location": NULLABLE_FK_FILTERS,
}

_taxon_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "ncbi_id": PK_FILTERS,
}

_individual_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "sex": CATEGORICAL_FILTERS,
    "pedigree": CATEGORICAL_FILTERS_LOOSE,
    "cohort": CATEGORICAL_FILTERS_LOOSE,
    "mother": NULLABLE_FK_FILTERS,
    "father": NULLABLE_FK_FILTERS,
    **_prefix_keys("taxon__", _taxon_filterset_fields),
}

_user_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "username": FREE_TEXT_FILTERS,
    "email": FREE_TEXT_FILTERS,
}

_group_filterset_fields: FiltersetFields = {
    "name": FREE_TEXT_FILTERS,
}

_sample_kind_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_project_minimal_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_sample_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "volume": SCALAR_FILTERS,
    "concentration": SCALAR_FILTERS,
    "depleted": ["exact"],
    "creation_date": DATE_FILTERS,
    "coordinates": FREE_TEXT_FILTERS,
    "comment": FREE_TEXT_FILTERS,

    "container": FK_FILTERS,  # PK
    "derived_samples__biosample__collection_site": FREE_TEXT_FILTERS,
    **_prefix_keys("container__", _container_filterset_fields),
    **_prefix_keys("derived_samples__project__", _project_minimal_filterset_fields),
    **_prefix_keys("derived_samples__biosample__individual__", _individual_filterset_fields),
    **_prefix_keys("derived_samples__sample_kind__", _sample_kind_filterset_fields),
}

_sample_minimal_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_sample_metadata_filterset_fields: FiltersetFields = {
    "biosample__id": FK_FILTERS,
}

_protocol_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_process_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "parent_process": FK_FILTERS,
}

_process_measurement_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "source_sample": FK_FILTERS,
    "execution_date": DATE_FILTERS,
    "volume_used": SCALAR_FILTERS,
    "comment": FREE_TEXT_FILTERS,
    "process": FK_FILTERS,
    **_prefix_keys("process__protocol__", _protocol_filterset_fields),
    **_prefix_keys("source_sample__", _sample_minimal_filterset_fields),
    **_prefix_keys("lineage__child__", _sample_minimal_filterset_fields),
}

_instrument_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_instrument_type_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "type": CATEGORICAL_FILTERS_LOOSE,
}

_run_type_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_experiment_run_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "start_date": DATE_FILTERS,
    "run_type": FK_FILTERS,
    "instrument": FK_FILTERS,
    "container": FK_FILTERS,
    "run_processing_launch_date": FK_FILTERS,

    **_prefix_keys("container__", _container_filterset_fields),
    **_prefix_keys("instrument__type__", _instrument_type_filterset_fields),
}

_project_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "principal_investigator": CATEGORICAL_FILTERS_LOOSE,
    "requestor_name": CATEGORICAL_FILTERS_LOOSE,
    "status": CATEGORICAL_FILTERS,
    "external_id": CATEGORICAL_FILTERS,
    "external_name": CATEGORICAL_FILTERS,
    **_prefix_keys("project_derived_samples__samples__", _sample_minimal_filterset_fields),
}

_index_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "index_set__name": CATEGORICAL_FILTERS_LOOSE,
    "index_set__id": PK_FILTERS,
    "index_structure__name": CATEGORICAL_FILTERS_LOOSE,
    "sequences_3prime__value": CATEGORICAL_FILTERS_LOOSE,
    "sequences_5prime__value": CATEGORICAL_FILTERS_LOOSE,
}

_sequence_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "value": CATEGORICAL_FILTERS_LOOSE,
}

_library_type_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_library_selection_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "target": CATEGORICAL_FILTERS_LOOSE,
}

_platform_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_imported_file_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "filename": FREE_TEXT_FILTERS,
}

# library uses a sample queryset. basic fields are sample fields.
_library_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "volume": SCALAR_FILTERS,
    "concentration": SCALAR_FILTERS,
    "depleted": ["exact"],
    "creation_date": DATE_FILTERS,
    "coordinates": FREE_TEXT_FILTERS,

    "container": FK_FILTERS,  # PK
    **_prefix_keys("container__", _container_filterset_fields),

    **_prefix_keys("derived_samples__project__", _project_minimal_filterset_fields),

    "derived_samples__library": FK_FILTERS,  # PK
    **_prefix_keys("derived_samples__library__library_type__", _library_type_filterset_fields),
    **_prefix_keys("derived_samples__library__library_selection__", _library_selection_filterset_fields),
    **_prefix_keys("derived_samples__library__platform__", _platform_filterset_fields),
    **_prefix_keys("derived_samples__library__index__", _index_filterset_fields),
    "derived_samples__library__library_size": SCALAR_FILTERS,
}

_dataset_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "run_name": CATEGORICAL_FILTERS_LOOSE,
    "external_project_id": CATEGORICAL_FILTERS_LOOSE,
    "lane": CATEGORICAL_FILTERS,
}

_dataset_file_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "dataset": FK_FILTERS,
    "file_path": CATEGORICAL_FILTERS_LOOSE,
    "sample_name": CATEGORICAL_FILTERS_LOOSE,
    "release_status": CATEGORICAL_FILTERS,
    "release_status_timestamp": DATE_FILTERS,
}

_pooled_sample_filterset_fields: FiltersetFields = {
    "sample__id": PK_FILTERS,
    "derived_sample__project__name": CATEGORICAL_FILTERS_LOOSE,
    "derived_sample__biosample__alias": CATEGORICAL_FILTERS_LOOSE,
    "volume_ratio": SCALAR_FILTERS,
    **_prefix_keys("derived_sample__library__library_type__", _library_type_filterset_fields),
    **_prefix_keys("derived_sample__library__library_selection__", _library_selection_filterset_fields),
    "derived_sample__library__library_size": SCALAR_FILTERS,
    "derived_sample__library__index__name": CATEGORICAL_FILTERS_LOOSE,
    **_prefix_keys("derived_sample__sample_kind__", _sample_kind_filterset_fields),
    "derived_sample__biosample__collection_site": CATEGORICAL_FILTERS_LOOSE,
    "derived_sample__biosample__individual__name": CATEGORICAL_FILTERS_LOOSE,
}

_workflow_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "structure": CATEGORICAL_FILTERS_LOOSE,
}

_reference_genome_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "assembly_name": CATEGORICAL_FILTERS_LOOSE,
    "synonym": CATEGORICAL_FILTERS_LOOSE,
    "genbank_id": CATEGORICAL_FILTERS_LOOSE,
    "refseq_id": CATEGORICAL_FILTERS_LOOSE,
    "size": SCALAR_FILTERS,
    **_prefix_keys("taxon__", _taxon_filterset_fields),
}

_study_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "letter": CATEGORICAL_FILTERS_LOOSE,
    "start": SCALAR_FILTERS,
    "end": SCALAR_FILTERS,
    **_prefix_keys("project__", _project_filterset_fields),
    **_prefix_keys("workflow__", _workflow_filterset_fields),
    **_prefix_keys("reference_genome__", _reference_genome_filterset_fields),
}

_sample_next_step_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "study__id": PK_FILTERS,
    "step_order__step__protocol__id": PK_FILTERS,
    "step_order__step__id": PK_FILTERS,
    "step_order__step__name": CATEGORICAL_FILTERS_LOOSE,
}

_step_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "protocol_id": PK_FILTERS,
}
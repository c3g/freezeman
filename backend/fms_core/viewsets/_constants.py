from typing import Dict, List
from ._utils import _prefix_keys


FREE_TEXT_FILTERS = ["contains", "icontains", "startswith"]
CATEGORICAL_FILTERS = ["exact", "in"]
CATEGORICAL_FILTERS_LOOSE = [*CATEGORICAL_FILTERS, *FREE_TEXT_FILTERS]
FK_FILTERS = CATEGORICAL_FILTERS
PK_FILTERS = ["in"]
NULLABLE_FILTERS = ["isnull"]
NULLABLE_FK_FILTERS = [*FK_FILTERS, *NULLABLE_FILTERS]
SCALAR_FILTERS = ["exact", "lt", "lte", "gt", "gte"]
DATE_FILTERS = [*SCALAR_FILTERS, "year", "month", "week", "week_day", "day"]

FiltersetFields = Dict[str, List[str]]

_coordinate_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "column": SCALAR_FILTERS,
    "row": SCALAR_FILTERS,
}

_container_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": FREE_TEXT_FILTERS,
    "barcode": FREE_TEXT_FILTERS,
    "kind": CATEGORICAL_FILTERS,
    **_prefix_keys("coordinate__", _coordinate_filterset_fields),
    "comment": FREE_TEXT_FILTERS,
    "update_comment": FREE_TEXT_FILTERS,
    "location": NULLABLE_FK_FILTERS,
}

_taxon_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "ncbi_id": PK_FILTERS,
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

_individual_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "sex": CATEGORICAL_FILTERS,
    "pedigree": CATEGORICAL_FILTERS_LOOSE,
    "cohort": CATEGORICAL_FILTERS_LOOSE,
    "mother": NULLABLE_FK_FILTERS,
    "father": NULLABLE_FK_FILTERS,
    **_prefix_keys("taxon__", _taxon_filterset_fields),
    **_prefix_keys("reference_genome__", _reference_genome_filterset_fields),
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
    **_prefix_keys("coordinate__", _coordinate_filterset_fields),
    "comment": FREE_TEXT_FILTERS,

    "container": FK_FILTERS,  # PK
    "derived_samples__biosample__collection_site": FREE_TEXT_FILTERS,
    "derived_samples__id": PK_FILTERS,
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

_platform_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_instrument_type_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "type": CATEGORICAL_FILTERS_LOOSE,
    "instruments": NULLABLE_FILTERS,
    **_prefix_keys("platform__", _platform_filterset_fields),
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
    "run_processing_launch_time": FK_FILTERS,

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
    "fragment_size": SCALAR_FILTERS,
    "depleted": ["exact"],
    "creation_date": DATE_FILTERS,
    **_prefix_keys("coordinate__", _coordinate_filterset_fields),

    "container": FK_FILTERS,  # PK
    **_prefix_keys("container__", _container_filterset_fields),

    **_prefix_keys("derived_samples__project__", _project_minimal_filterset_fields),

    "derived_samples__library": FK_FILTERS,  # PK
    **_prefix_keys("derived_samples__library__library_type__", _library_type_filterset_fields),
    **_prefix_keys("derived_samples__library__library_selection__", _library_selection_filterset_fields),
    **_prefix_keys("derived_samples__library__platform__", _platform_filterset_fields),
    **_prefix_keys("derived_samples__library__index__", _index_filterset_fields),
}

_dataset_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "run_name": CATEGORICAL_FILTERS_LOOSE,
    "external_project_id": CATEGORICAL_FILTERS_LOOSE,
    "lane": CATEGORICAL_FILTERS,
    "project_name": CATEGORICAL_FILTERS_LOOSE,
    "metric_report_url": CATEGORICAL_FILTERS_LOOSE,
    "experiment_run": FK_FILTERS,
}

_readset_filterset_fields: FiltersetFields = {
    "id" : PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "sample_name": CATEGORICAL_FILTERS_LOOSE,
    "derived_sample": FK_FILTERS,
    **_prefix_keys("dataset__", _dataset_filterset_fields),
}

_dataset_file_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    **_prefix_keys("readset__", _readset_filterset_fields),
    "file_path": CATEGORICAL_FILTERS_LOOSE,
    "release_status": CATEGORICAL_FILTERS,
    "release_status_timestamp": DATE_FILTERS,
    "validation_status": CATEGORICAL_FILTERS,
    "validation_status_timestamp": DATE_FILTERS,
}

_pooled_sample_filterset_fields: FiltersetFields = {
    "sample__id": PK_FILTERS,
    "sample__fragment_size": SCALAR_FILTERS,
    "derived_sample__project__name": CATEGORICAL_FILTERS_LOOSE,
    "derived_sample__biosample__alias": CATEGORICAL_FILTERS_LOOSE,
    "volume_ratio": SCALAR_FILTERS,
    **_prefix_keys("derived_sample__library__library_type__", _library_type_filterset_fields),
    **_prefix_keys("derived_sample__library__library_selection__", _library_selection_filterset_fields),
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

_study_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "letter": CATEGORICAL_FILTERS_LOOSE,
    "start": SCALAR_FILTERS,
    "end": SCALAR_FILTERS,
    **_prefix_keys("project__", _project_filterset_fields),
    **_prefix_keys("workflow__", _workflow_filterset_fields),
}

_step_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "protocol_id": PK_FILTERS,
}

_sample_next_step_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "sample__id": PK_FILTERS,
    "studies__id": PK_FILTERS,
    "sample__derived_samples__sample_kind__name": CATEGORICAL_FILTERS_LOOSE,
    "sample__name": CATEGORICAL_FILTERS_LOOSE,
    "sample__derived_samples__biosample__individual__name": CATEGORICAL_FILTERS_LOOSE,
    "sample__container__name": CATEGORICAL_FILTERS_LOOSE,
    "sample__container__barcode": CATEGORICAL_FILTERS_LOOSE,
    **_prefix_keys("sample__coordinate__", _coordinate_filterset_fields),
    "sample__volume": SCALAR_FILTERS,
    "sample__concentration": SCALAR_FILTERS,
    "sample__fragment_size": SCALAR_FILTERS,
    "sample__creation_date": DATE_FILTERS,
    "sample__depleted": ["exact"],
    "sample__derived_samples__library__library_type__name": CATEGORICAL_FILTERS_LOOSE,
    "sample__derived_samples__library__library_selection__target": CATEGORICAL_FILTERS_LOOSE,
    "sample__derived_samples__library__index__name": CATEGORICAL_FILTERS_LOOSE,
    "sample__derived_samples__library__platform__name": CATEGORICAL_FILTERS_LOOSE,
    "sample__derived_samples__project__name": CATEGORICAL_FILTERS_LOOSE,
    **_prefix_keys("step__", _step_filterset_fields),
}

_step_order_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "next_step_order__id": PK_FILTERS,
    "order": SCALAR_FILTERS,
    **_prefix_keys("step__", _step_filterset_fields),
    **_prefix_keys("workflow__", _workflow_filterset_fields),
}

_sample_next_step_by_study_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    **_prefix_keys("study__", _study_filterset_fields),
    **_prefix_keys("step_order__", _step_order_filterset_fields),
    **_prefix_keys("sample_next_step__", _sample_next_step_filterset_fields),
}

_stephistory_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    **_prefix_keys("study__", _study_filterset_fields),
    **_prefix_keys("step_order__", _step_order_filterset_fields),
    **_prefix_keys("process_measurement__", _process_measurement_filterset_fields),
}

_metric_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "metric_group": CATEGORICAL_FILTERS_LOOSE,
    "value_numeric": SCALAR_FILTERS,
    "value_string": CATEGORICAL_FILTERS_LOOSE,
    "readset__sample_name": CATEGORICAL_FILTERS_LOOSE,
    "readset__derived_sample_id": PK_FILTERS,
    "readset__dataset__experiment_run_id": PK_FILTERS,
    "readset__dataset__run_name": CATEGORICAL_FILTERS_LOOSE,
    "readset__dataset__lane": CATEGORICAL_FILTERS,
}

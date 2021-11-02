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

_individual_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "taxon": CATEGORICAL_FILTERS,
    "sex": CATEGORICAL_FILTERS,
    "pedigree": CATEGORICAL_FILTERS_LOOSE,
    "cohort": CATEGORICAL_FILTERS_LOOSE,

    "mother": NULLABLE_FK_FILTERS,
    "father": NULLABLE_FK_FILTERS,
}

_user_filterset_fields: FiltersetFields = {
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

_sampleview_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "sample_kind_id": FK_FILTERS,
    "volume": SCALAR_FILTERS,
    "concentration": SCALAR_FILTERS,
    "depleted": ["exact"],
    "collection_site": CATEGORICAL_FILTERS_LOOSE,
    "tissue_source": CATEGORICAL_FILTERS,
    "creation_date": DATE_FILTERS,
    "coordinates": FREE_TEXT_FILTERS,

    "individual_id": FK_FILTERS,  # PK
    "container_id": FK_FILTERS,  # PK
    "biosample_id": FK_FILTERS,  # PK
    "derived_sample_id": FK_FILTERS,  # PK
}

_sample_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "sample_kind": FK_FILTERS,
    "volume": SCALAR_FILTERS,
    "concentration": SCALAR_FILTERS,
    "depleted": ["exact"],
    "collection_site": CATEGORICAL_FILTERS_LOOSE,
    "tissue_source": CATEGORICAL_FILTERS,
    "creation_date": DATE_FILTERS,
    "coordinates": FREE_TEXT_FILTERS,
    "comment": FREE_TEXT_FILTERS,

    "individual": FK_FILTERS,  # PK
    "container": FK_FILTERS,  # PK
    **_prefix_keys("sample_kind__", _sample_kind_filterset_fields),
    **_prefix_keys("container__", _container_filterset_fields),
    **_prefix_keys("individual__", _individual_filterset_fields),
    **_prefix_keys("projects__", _project_minimal_filterset_fields),
}

_sample_minimal_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
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
    "start_date": DATE_FILTERS,

    "run_type": FK_FILTERS,
    "instrument": FK_FILTERS,
    "container": FK_FILTERS,

    **_prefix_keys("container__", _container_filterset_fields),
    **_prefix_keys("instrument__type__", _instrument_type_filterset_fields),
}

_project_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "principal_investigator": CATEGORICAL_FILTERS_LOOSE,
    "requestor_name": CATEGORICAL_FILTERS_LOOSE,
    "status": CATEGORICAL_FILTERS,
    **_prefix_keys("samples__", _sample_minimal_filterset_fields),
}

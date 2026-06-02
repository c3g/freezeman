from fms_core.queries.project_overview.readsets import PROJECT_OVERVIEW_READSETS_BY_EXTERNAL_ID_QUERY
from fms_core.services.query_utils import execute_query



def get_project_overview_readsets_by_external_id(external_id: str):
    query = PROJECT_OVERVIEW_READSETS_BY_EXTERNAL_ID_QUERY
    params = (external_id,)
    return execute_query(query, params)

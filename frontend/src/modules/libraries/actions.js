import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {LIBRARY_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET                   = createNetworkActionTypes("LIBRARIES.GET");
export const LIST                  = createNetworkActionTypes("LIBRARIES.LIST");
export const LIST_TABLE            = createNetworkActionTypes("LIBRARIES.LIST_TABLE");
export const LIST_FILTER           = createNetworkActionTypes("LIBRARIES.LIST_FILTER");
export const SET_SORT_BY           = "LIBRARIES.SET_SORT_BY";
export const SET_FILTER            = "LIBRARIES.SET_FILTER";
export const SET_FILTER_OPTION     = "LIBRARIES.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "LIBRARIES.CLEAR_FILTERS";
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("LIBRARIES.LIST_TEMPLATE_ACTIONS");
export const LIST_PREFILL_TEMPLATES = createNetworkActionTypes("LIBRARIES.LIST_PREFILL_TEMPLATES");
export const SUMMARY               = createNetworkActionTypes("LIBRARIES.SUMMARY");

export const get = id => async (dispatch, getState) => {
    const library = getState().libraries.itemsByID[id];
    if (library && library.isFetching)
        return;

    return await dispatch(networkAction(GET, api.libraries.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.libraries.list(params),
        { meta: params }
    ));
};

export const listFilter = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT, filters = {}, sortBy }, abort) => async (dispatch, getState) => {
    if(getState().libraries.isFetching && !abort)
      return

    limit = getState().pagination.pageSize;
    filters = serializeFilterParams(filters, LIBRARY_FILTERS)
    const ordering = serializeSortByParams(sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_FILTER,
        api.libraries.list(options, abort),
        { meta: {...options} }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const libraries = getState().libraries
    if (libraries.isFetching && !abort)
        return

    const limit = getState().pagination.pageSize;
    const filters = serializeFilterParams(libraries.filters, LIBRARY_FILTERS)
    const ordering = serializeSortByParams(libraries.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.libraries.list(options, abort),
        { meta: { ...options, ignoreError: 'AbortError' } }
    ));
};

export const setSortBy = thenList((key, order) => {
    return {
        type: SET_SORT_BY,
        data: { key, order }
    }
});

export const setFilter = thenList((name, value) => {
    return {
        type: SET_FILTER,
        data: { name, value}
    }
});

export const setFilterOption = thenList((name, option, value) => {
    return {
        type: SET_FILTER_OPTION,
        data: { name, option, value }
    }
});

export const clearFilters = thenList(() => {
    return {
        type: CLEAR_FILTERS,
    }
});

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().libraryTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.libraries.template.actions()));
};

export const listPrefillTemplates = () => (dispatch, getState) => {
  if (getState().libraryPrefillTemplates.isFetching) return;
  return dispatch(networkAction(LIST_PREFILL_TEMPLATES, api.libraries.prefill.templates()));
};

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.libraries.summary()));

export default {
    GET,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST,
    LIST_FILTER,
    LIST_TABLE,
    LIST_TEMPLATE_ACTIONS,
    LIST_PREFILL_TEMPLATES,
    SUMMARY,
    get,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listFilter,
    listTable,
    listTemplateActions,
    listPrefillTemplates,
    summary,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

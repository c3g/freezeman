import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {INDEX_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET                   = createNetworkActionTypes("INDICES.GET");
export const LIST                  = createNetworkActionTypes("INDICES.LIST");
export const LIST_TABLE            = createNetworkActionTypes("INDICES.LIST_TABLE");
export const SET_SORT_BY           = "INDICES.SET_SORT_BY";
export const SET_FILTER            = "INDICES.SET_FILTER";
export const SET_FILTER_OPTION     = "INDICES.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "INDICES.CLEAR_FILTERS";
export const SUMMARY               = createNetworkActionTypes("INDICES.SUMMARY");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("INDICES.LIST_TEMPLATE_ACTIONS");
export const VALIDATE              = createNetworkActionTypes("INDICES.VALIDATE");

export const get = id => async (dispatch, getState) => {
    const index = getState().indices.itemsByID[id];
    if (index && index.isFetching)
        return;

    return await dispatch(networkAction(GET, api.indices.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.indices.list(params),
        { meta: params }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const indices = getState().indices
    if (indices.isFetching && !abort)
        return

    const limit = getState().pagination.pageSize;
    const filters = serializeFilterParams(indices.filters, INDEX_FILTERS)
    const ordering = serializeSortByParams(indices.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.indices.list(options, abort),
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

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.indices.summary()));

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().indicesTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.indices.template.actions()));
};

export const validate = (options) => async (dispatch, getState) => {
    return await dispatch(networkAction(VALIDATE,
        api.indices.validate(options),
        { meta: { ignoreError: 'APIError' } }
    ));
};

export default {
    GET,
    LIST,
    LIST_TABLE,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    SUMMARY,
    LIST_TEMPLATE_ACTIONS,
    VALIDATE,
    get,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listTable,
    summary,
    listTemplateActions,
    validate
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

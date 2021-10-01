import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {PROJECT_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET                   = createNetworkActionTypes("PROJECTS.GET");
export const ADD                   = createNetworkActionTypes("PROJECTS.ADD");
export const UPDATE                = createNetworkActionTypes("PROJECTS.UPDATE");
export const LIST                  = createNetworkActionTypes("PROJECTS.LIST");
export const LIST_TABLE            = createNetworkActionTypes("PROJECTS.LIST_TABLE");
export const LIST_FILTER           = createNetworkActionTypes("PROJECTS.LIST_FILTER");
export const SET_SORT_BY           = "PROJECTS.SET_SORT_BY";
export const SET_FILTER            = "PROJECTS.SET_FILTER";
export const SET_FILTER_OPTION     = "PROJECTS.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "PROJECTS.CLEAR_FILTERS";
export const SUMMARY               = createNetworkActionTypes("PROJECTS.SUMMARY");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("PROJECTS.LIST_TEMPLATE_ACTIONS");

export const get = id => async (dispatch, getState) => {
    const project = getState().projects.itemsByID[id];
    if (project && project.isFetching)
        return;

    return await dispatch(networkAction(GET, api.projects.get(id), { meta: { id } }));
};

export const add = project => async (dispatch, getState) => {
    if (getState().projects.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.projects.add(project), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, project) => async (dispatch, getState) => {
    if (getState().projects.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.projects.update(project), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.samples.list(params),
        { meta: params }
    ));
};

export const listFilter = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT, filters = {}, sortBy, filterKey } = {}) => async (dispatch, getState) => {
    //Prevents the default fetch without any filters
    if (!filters[filterKey] || !filters[filterKey]["value"])
        return;

    limit = getState().pagination.pageSize;
    filters = serializeFilterParams(filters, PROJECT_FILTERS)
    const ordering = serializeSortByParams(sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_FILTER,
        api.projects.list(options),
        { meta: {...options} }
    ));
};


export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const projects = getState().projects
    if (projects.isFetching && !abort)
        return

    const limit = getState().pagination.pageSize;
    const filters = serializeFilterParams(projects.filters, PROJECT_FILTERS)
    const ordering = serializeSortByParams(projects.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.projects.list(options, abort),
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

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.projects.summary()));

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().projectTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.projects.template.actions()));
};

export default {
    GET,
    ADD,
    UPDATE,
    LIST,
    LIST_FILTER,
    LIST_TABLE,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    SUMMARY,
    LIST_TEMPLATE_ACTIONS,
    get,
    add,
    update,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listFilter,
    listTable,
    summary,
    listTemplateActions,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

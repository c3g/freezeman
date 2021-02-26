import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {CONTAINER_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET = createNetworkActionTypes("CONTAINERS.GET");
export const ADD = createNetworkActionTypes("CONTAINERS.ADD");
export const UPDATE = createNetworkActionTypes("CONTAINERS.UPDATE");
export const SET_SORT_BY = "CONTAINERS.SET_SORT_BY";
export const SET_FILTER = "CONTAINERS.SET_FILTER";
export const SET_FILTER_OPTION = "CONTAINERS.SET_FILTER_OPTION"
export const CLEAR_FILTERS = "CONTAINERS.CLEAR_FILTERS";
export const LIST = createNetworkActionTypes("CONTAINERS.LIST");
export const LIST_TABLE = createNetworkActionTypes("CONTAINERS.LIST_TABLE");
export const LIST_PARENTS = createNetworkActionTypes("CONTAINERS.LIST_PARENTS");
export const LIST_CHILDREN = createNetworkActionTypes("CONTAINERS.LIST_CHILDREN");
export const LIST_SAMPLES = createNetworkActionTypes("CONTAINERS.LIST_SAMPLES");
export const LIST_KINDS = createNetworkActionTypes("CONTAINERS.LIST_KINDS");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("CONTAINERS.LIST_TEMPLATE_ACTIONS");
export const SUMMARY = createNetworkActionTypes("CONTAINERS.SUMMARY");

export const get = id => async (dispatch, getState) => {
    const container = getState().containers.itemsByID[id];
    if (container && container.isFetching)
        return;

    return await dispatch(networkAction(GET, api.containers.get(id), { meta: { id } }));
};

export const add = container => async (dispatch, getState) => {
    if (getState().containers.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.containers.add(container), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, container) => async (dispatch, getState) => {
    if (getState().containers.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.containers.update(container), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.containers.list(params),
        { meta: params }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const containers = getState().containers
    if (containers.isFetching && !abort)
        return

    const filters = serializeFilterParams(containers.filters, CONTAINER_FILTERS)
    const ordering = serializeSortByParams(containers.sortBy)
    const options = { limit, offset, ordering, ...filters}

    const res =  await dispatch(networkAction(LIST_TABLE,
        api.containers.list(options, abort),
        { meta: { ...options, ignoreError: 'AbortError' } }
    ));
    return res
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

export const listParents = (id) => async (dispatch, getState) => {
    const container = getState().containers.itemsByID[id];
    if (!container || container.isFetching) return;

    return await dispatch(networkAction(
        LIST_PARENTS,
        api.containers.listParents(id),
        { meta: { id } }
    ));
};

/**
 * @param {String} id
 * @param {String[]} excludes - list of containers already loaded; avoid showing them as loading
 */
export const listChildren = (id, excludes = []) => async (dispatch, getState) => {
    const container = getState().containers.itemsByID[id];
    if (!container || container.isFetching) return;

    return await dispatch(networkAction(
        LIST_CHILDREN,
        api.containers.listChildren(id),
        { meta: { id, excludes } }
    ));
};

export const listSamples = (id) => async (dispatch, getState) => {
    const container = getState().containers.itemsByID[id];
    if (!container || container.isFetching) return;

    return await dispatch(networkAction(
        LIST_SAMPLES,
        api.containers.listSamples(id),
        { meta: { id, samples: container.samples } }
    ));
};

export const listKinds = () => async (dispatch, getState) => {
    // Check if we're already fetching or have fetched container kinds first (they won't change dynamically.)
    if (getState().containerKinds.isFetching || getState().containerKinds.items.length > 0)
        return;

    return await dispatch(networkAction(LIST_KINDS, api.containerKinds.list()));
};

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().containerTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.containers.template.actions()));
};

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.containers.summary()));

export default {
    GET,
    ADD,
    UPDATE,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST,
    LIST_TABLE,
    LIST_PARENTS,
    LIST_CHILDREN,
    LIST_SAMPLES,
    LIST_KINDS,
    LIST_TEMPLATE_ACTIONS,
    SUMMARY,
    get,
    add,
    update,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listTable,
    listParents,
    listChildren,
    listSamples,
    listKinds,
    listTemplateActions,
    summary,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

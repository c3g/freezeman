import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {USER_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET = createNetworkActionTypes("USERS.GET");
export const ADD = createNetworkActionTypes("USERS.ADD");
export const UPDATE = createNetworkActionTypes("USERS.UPDATE");
export const LIST = createNetworkActionTypes("USERS.LIST");
export const LIST_TABLE = createNetworkActionTypes("USERS.LIST_TABLE");
export const LIST_VERSIONS = createNetworkActionTypes("USERS.LIST_VERSIONS");
export const SET_SORT_BY = "USERS.SET_SORT_BY";
export const SET_FILTER = "USERS.SET_FILTER";
export const SET_FILTER_OPTION = "USERS.SET_FILTER_OPTION"
export const CLEAR_FILTERS = "USERS.CLEAR_FILTERS";

export const get = id => async (dispatch, getState) => {
    const user = getState().users.itemsByID[id];
    if (user && user.isFetching)
        return;

    return await dispatch(networkAction(GET, api.users.get(id), { meta: { id } }));
};

export const add = user => async (dispatch, getState) => {
    if (getState().users.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.users.add(user), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, user) => async (dispatch, getState) => {
    if (getState().users.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.users.update(user), { meta: { id, ignoreError: 'APIError' }}));
};

export const updateSelf = (user) => async (dispatch, getState) => {
    const id = getState().auth.currentUserID
    if (!id || getState().users.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.users.updateSelf(user), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.users.list(params),
        { meta: params }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const users = getState().users
    if (users.isFetching && !abort)
        return

    const filters = serializeFilterParams(users.filters, USER_FILTERS)
    const ordering = serializeSortByParams(users.sortBy)
    const options = { limit, offset, ordering, ...filters}

    const res =  await dispatch(networkAction(LIST_TABLE,
        api.users.list(options, abort),
        { meta: { ...options, ignoreError: 'AbortError' } }
    ));
    return res
};

export const listVersions = (id) => (dispatch, getState) => {
    const user = getState().users.itemsByID[id];
    if (user.isFetching) return Promise.resolve();
    const meta = { id };
    return dispatch(networkAction(LIST_VERSIONS, api.users.listVersions(id), { meta }));
}


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

export const setFilterOption = thenList((name, options) => {
    return {
        type: SET_FILTER_OPTION,
        data: { name, options }
    }
});

export const clearFilters = thenList(() => {
    return {
        type: CLEAR_FILTERS,
    }
});

export default {
    GET,
    ADD,
    UPDATE,
    LIST,
    LIST_TABLE,
    LIST_VERSIONS,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    get,
    add,
    update,
    list,
    listTable,
    listVersions,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

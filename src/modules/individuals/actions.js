import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {INDIVIDUAL_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET = createNetworkActionTypes("INDIVIDUALS.GET");
export const ADD = createNetworkActionTypes("INDIVIDUALS.ADD");
export const UPDATE = createNetworkActionTypes("INDIVIDUALS.UPDATE");
export const LIST = createNetworkActionTypes("INDIVIDUALS.LIST");
export const LIST_TABLE = createNetworkActionTypes("INDIVIDUALS.LIST_TABLE");
export const SET_SORT_BY = "INDIVIDUALS.SET_SORT_BY"
export const SET_FILTER = "INDIVIDUALS.SET_FILTER";
export const SET_FILTER_OPTION = "INDIVIDUALS.SET_FILTER_OPTION"
export const CLEAR_FILTERS = "INDIVIDUALS.CLEAR_FILTERS";

export const get = id => async (dispatch, getState) => {
    const individual = getState().individuals.itemsByID[id];
    if (individual && individual.isFetching)
        return;

    return await dispatch(networkAction(GET, api.individuals.get(id), { meta: { id } }));
};

export const add = individual => async (dispatch, getState) => {
    if (getState().individuals.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.individuals.add(individual), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, individual) => async (dispatch, getState) => {
    if (getState().individuals.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.individuals.update(individual), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.individuals.list(params),
        { meta: params }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const {individuals} = getState();
    if (individuals.isFetching && !abort)
        return

    const filters = serializeFilterParams(individuals.filters, INDIVIDUAL_FILTERS)
    const ordering = serializeSortByParams(individuals.sortBy)
    const options = { limit, offset, ordering, ...filters }

    return await dispatch(networkAction(LIST_TABLE,
        api.individuals.list(options, abort),
        { meta: { ...options, ignoreError: 'AbortError' } }
    ));
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

export default {
    GET,
    ADD,
    UPDATE,
    LIST,
    LIST_TABLE,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    get,
    add,
    update,
    list,
    listTable,
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

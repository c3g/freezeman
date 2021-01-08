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
export const SET_SORT_BY = "INDIVIDUALS.SET_SORT_BY"
export const SET_FILTER = "CONTAINERS.SET_FILTER";
export const CLEAR_FILTERS = "CONTAINERS.CLEAR_FILTERS";

export const get = id => async (dispatch, getState) => {
    const individual = getState().individuals.itemsByID[id];
    if (individual && individual.isFetching)
        return;

    return await dispatch(networkAction(GET, api.individuals.get(id), { meta: { id } }));
};

export const add = individual => async (dispatch, getState) => {
    if (getState().individuals.isFetching)
        return;

    return await dispatch(networkAction(ADD, api.individuals.add(individual)));
};

export const update = (id, individual) => async (dispatch, getState) => {
    if (getState().individuals.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(UPDATE, api.individuals.update(individual), { meta: { id } }));
};

export const list = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const {individuals} = getState();
    if (individuals.isFetching && !abort)
        return

    const filters = serializeFilterParams(individuals.filters, INDIVIDUAL_FILTERS)
    const ordering = serializeSortByParams(individuals.sortBy)
    const options = { limit, offset, ordering, ...filters }

    return await dispatch(networkAction(LIST,
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
        data: { name, value }
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
    SET_SORT_BY,
    SET_FILTER,
    CLEAR_FILTERS,
    get,
    add,
    update,
    list,
    setSortBy,
    setFilter,
    clearFilters,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(list(undefined, true))
    }
}

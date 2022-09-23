import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {POOLED_SAMPLES_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const LIST_FILTER           = createNetworkActionTypes("POOLED_SAMPLES.LIST_FILTER");
export const SET_SORT_BY           = "POOLED_SAMPLES.SET_SORT_BY";
export const SET_FILTER            = "POOLED_SAMPLES.SET_FILTER";
export const SET_FILTER_OPTION     = "POOLED_SAMPLES.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "POOLED_SAMPLES.CLEAR_FILTERS";

// This is a regular 'listFilter' function except that it adds the pool id as a pool_id query parameter.
export const createListFilterForPool = (pool_id) => ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT, filters = {}, sortBy }, abort) => async (dispatch, getState) => {
    if(getState().pooledSamples.isFetching && !abort)
      return

    limit = getState().pagination.pageSize;
    // filters = serializeFilterParams(filters, POOLED_SAMPLES_FILTERS)
    // const ordering = serializeSortByParams(sortBy)
    filters = {}
    const ordering = undefined
    const options = { limit, offset, ordering, ...filters, pool_id}

    return await dispatch(networkAction(LIST_FILTER,
        api.pooledSamples.list(options, abort),
        { meta: {...options} }
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

export default {
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST_FILTER,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    createListFilterForPool,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listFilter(undefined, true))
    }
}

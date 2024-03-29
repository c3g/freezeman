import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"
import serializeFilterParams from "../../utils/serializeFilterParams";
import { serializeSortByParamsWithFilterKey } from "../../utils/serializeSortByParams";
import {POOLED_SAMPLES_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const LIST_TABLE             = createNetworkActionTypes("POOLED_SAMPLES.LIST_TABLE")
export const SET_SORT_BY            = "POOLED_SAMPLES.SET_SORT_BY"
export const SET_FIXED_FILTER      = "POOLED_SAMPLES.SET_FIXED_FILTER"
export const SET_FILTER             = "POOLED_SAMPLES.SET_FILTER"
export const SET_FILTER_OPTION      = "POOLED_SAMPLES.SET_FILTER_OPTION"
export const CLEAR_FILTERS          = "POOLED_SAMPLES.CLEAR_FILTERS"
export const FLUSH_STATE            = "POOLED_SAMPLES.FLUSH_STATE"


// This is a regular 'listFilter' function except that it adds the pool id as a pool_id query parameter.
export const listTable =  ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {

    const pooledSamples = getState().pooledSamples

    if(pooledSamples.isFetching && !abort)
      return

    // Safety check - make sure the pool_id is set so that the backend doesn't blow up if it's missing.
    if (!pooledSamples.fixedFilters.sample__id) {
        return Promise.reject(Error("pool_id must be set as a fixed filter before listTable can be called"))
    }

    // The pool id is stored as a fixed filter value, and is merged with the user-editable filters.
    const mergedFilters = Object.assign({}, pooledSamples.filters, pooledSamples.fixedFilters)
    const serializedFilters = serializeFilterParams(mergedFilters, POOLED_SAMPLES_FILTERS)

    const ordering = serializeSortByParamsWithFilterKey(pooledSamples.sortBy, POOLED_SAMPLES_FILTERS)
    limit = getState().pagination.pageSize;
    const options = { limit, offset, ordering, ...serializedFilters}

    return await dispatch(networkAction(LIST_TABLE,
        api.pooledSamples.list(options, abort),
        { meta: { ...options, ignoreError: 'AbortError' } }
    ));
};

/**
 * Set the id of the sample contained the pooled samples. Must be called once by the component
 * when it is mounted.
 * 
 * This just sets a fixed filter named "pool_id" 
 * @param {*} poolId 
 * @returns 
 */
export const setPoolId = (poolId) => {
    return setFixedFilter("sample__id", poolId)
}

/**
 * Set a "fixed" filter. A fixed filter is a filter value that is included with every
 * request to listTable, and which the user cannot control. If used, it must be set
 * when a component mounts, before it requests data.
 * @param {*} key 
 * @param {*} value 
 * @returns 
 */
export const setFixedFilter = (name, value) => {
    return {
        type: SET_FIXED_FILTER,
        data: {name, value}
    }
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

/**
 * Flush the pooled samples redux state (when the component is destroyed).
 * @returns void
 */
export const flushState = () => {
    return {
        type: FLUSH_STATE
    }
}

export default {
    FLUSH_STATE,
    SET_SORT_BY,
    SET_FIXED_FILTER,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST_TABLE,
    setPoolId,
    setSortBy,
    setFixedFilter,
    setFilter,
    setFilterOption,
    clearFilters,
    listTable,
    flushState
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {SAMPLE_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";


export const LIST_TABLE            = createNetworkActionTypes("TEMPORARY_ITEMS.LIST_TABLE");
export const SET_SORT_BY           = "TEMPORARY_ITEMS.SET_SORT_BY";
export const SET_FILTER            = "TEMPORARY_ITEMS.SET_FILTER";
export const SET_FILTER_OPTION     = "TEMPORARY_ITEMS.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "TEMPORARY_ITEMS.CLEAR_FILTERS";


export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const samples = getState().samples
    if (samples.isFetching && !abort)
        return

    const limit = getState().pagination.pageSize;
    const filters = serializeFilterParams(samples.filters, SAMPLE_FILTERS)
    const ordering = serializeSortByParams(samples.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.samples.list(options, abort),
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


export default {
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST_TABLE,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    listTable,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

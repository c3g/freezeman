import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";
import {EXPERIMENT_RUN_FILTERS} from "../../components/filters/descriptions";

// TODO: SUMMARY, LIST_TEMPLATE_ACTIONS

export const GET                   = createNetworkActionTypes("EXPERIMENT_RUNS.GET");
export const LIST                  = createNetworkActionTypes("EXPERIMENT_RUNS.LIST");
export const LIST_TABLE            = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_TABLE");
export const SET_SORT_BY           = "EXPERIMENT_RUNS.SET_SORT_BY";
export const SET_FILTER            = "EXPERIMENT_RUNS.SET_FILTER";
export const SET_FILTER_OPTION     = "EXPERIMENT_RUNS.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "EXPERIMENT_RUNS.CLEAR_FILTERS";
export const LIST_TYPES            = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_TYPES");


export const get = id => async (dispatch, getState) => {
    const experimentRun = getState().experimentRuns.itemsByID[id];
    if (experimentRun && experimentRun.isFetching)
        return;

    return await dispatch(networkAction(GET, api.experimentRuns.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.experimentRuns.list(params),
        { meta: params }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const experimentRuns = getState().experimentRuns
    if (experimentRuns.isFetching && !abort)
        return

    const filters = serializeFilterParams(experimentRuns.filters, EXPERIMENT_RUN_FILTERS)
    const ordering = serializeSortByParams(experimentRuns.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.experimentRuns.list(options, abort),
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

export const listTypes = () => async (dispatch, getState) => {
    if (getState().experimentTypes.isFetching || getState().experimentTypes.items.length > 0)
        return;

    return await dispatch(networkAction(LIST_TYPES, api.experimentTypes.list()));
};


export default {
    GET,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST,
    LIST_TABLE,
    LIST_TYPES,
    get,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listTable,
    listTypes,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}
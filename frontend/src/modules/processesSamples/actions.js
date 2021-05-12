import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {PROCESS_SAMPLE_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET                   = createNetworkActionTypes("PROCESSES_SAMPLES.GET");
export const LIST                  = createNetworkActionTypes("PROCESSES_SAMPLES.LIST");
export const LIST_TABLE            = createNetworkActionTypes("PROCESSES_SAMPLES.LIST_TABLE");
export const SET_SORT_BY           = "PROCESSES_SAMPLES.SET_SORT_BY";
export const SET_FILTER            = "PROCESSES_SAMPLES.SET_FILTER";
export const SET_FILTER_OPTION     = "PROCESSES_SAMPLES.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "PROCESSES_SAMPLES.CLEAR_FILTERS";
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("PROCESSES_SAMPLES.LIST_TEMPLATE_ACTIONS");
export const SUMMARY               = createNetworkActionTypes("PROCESSES_SAMPLES.SUMMARY");

export const get = id => async (dispatch, getState) => {
    const processSample = getState().processesSamples.itemsByID[id];
    if (processSample && processSample.isFetching)
        return;

    return await dispatch(networkAction(GET, api.processesSamples.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.processesSamples.list(params),
        { meta: params }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const processesSamples = getState().processesSamples
    if (processesSamples.isFetching && !abort)
        return

    const filters = serializeFilterParams(processesSamples.filters, PROCESS_SAMPLE_FILTERS)
    const ordering = serializeSortByParams(processesSamples.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.processesSamples.list(options, abort),
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

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().processSampleTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.processesSamples.template.actions()));
};

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.processesSamples.summary()));

export default {
    GET,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST,
    LIST_TABLE,
    SUMMARY,
    LIST_TEMPLATE_ACTIONS,
    get,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listTable,
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

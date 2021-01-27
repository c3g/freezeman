import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {SAMPLE_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET                   = createNetworkActionTypes("SAMPLES.GET");
export const ADD                   = createNetworkActionTypes("SAMPLES.ADD");
export const UPDATE                = createNetworkActionTypes("SAMPLES.UPDATE");
export const LIST                  = createNetworkActionTypes("SAMPLES.LIST");
export const SET_SORT_BY           = "SAMPLES.SET_SORT_BY";
export const SET_FILTER            = "SAMPLES.SET_FILTER";
export const SET_FILTER_OPTION    = "SAMPLES.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "SAMPLES.CLEAR_FILTERS";
export const LIST_VERSIONS         = createNetworkActionTypes("SAMPLES.LIST_VERSIONS");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("SAMPLES.LIST_TEMPLATE_ACTIONS");
export const SUMMARY               = createNetworkActionTypes("SAMPLES.SUMMARY");

export const get = id => async (dispatch, getState) => {
    const sample = getState().samples.itemsByID[id];
    if (sample && sample.isFetching)
        return;

    return await dispatch(networkAction(GET, api.samples.get(id), { meta: { id } }));
};

export const add = sample => async (dispatch, getState) => {
    if (getState().samples.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.samples.add(sample), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, sample) => async (dispatch, getState) => {
    if (getState().samples.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.samples.update(sample), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const samples = getState().samples
    if (samples.isFetching && !abort)
        return

    const filters = serializeFilterParams(samples.filters, SAMPLE_FILTERS)
    const ordering = serializeSortByParams(samples.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST,
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

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().sampleTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.samples.template.actions()));
};

export const listVersions = (id) => async (dispatch, getState) => {
    const sample = getState().samples.itemsByID[id];
    if (!sample || sample.isFetching) return;

    return await dispatch(networkAction(
        LIST_VERSIONS,
        api.samples.listVersions(id),
        { meta: { id } }
    ));
}

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.samples.summary()));

export default {
    GET,
    ADD,
    UPDATE,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST,
    SUMMARY,
    LIST_VERSIONS,
    LIST_TEMPLATE_ACTIONS,
    get,
    add,
    update,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listVersions,
    listTemplateActions,
    summary,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(list(undefined, true))
    }
}

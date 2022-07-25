import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {DATASET_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";
import { list as listFiles } from "../datasetFiles/actions";

export const GET                   = createNetworkActionTypes("DATASETS.GET");
export const UPDATE                = createNetworkActionTypes("DATASETS.UPDATE");
export const LIST                  = createNetworkActionTypes("DATASETS.LIST");
export const LIST_TABLE            = createNetworkActionTypes("DATASETS.LIST_TABLE");
export const LIST_FILTER           = createNetworkActionTypes("DATASETS.LIST_FILTER");
export const SET_SORT_BY           = "DATASETS.SET_SORT_BY";
export const SET_FILTER            = "DATASETS.SET_FILTER";
export const SET_FILTER_OPTION     = "DATASETS.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "DATASETS.CLEAR_FILTERS";
export const SET_RELEASE_FLAGS     = createNetworkActionTypes("DATASETS.SET_RELEASE_FLAGS");

export const get = id => async (dispatch, getState) => {
    const dataset = getState().datasets.itemsByID[id];
    if (dataset && dataset.isFetching)
        return;

    return await dispatch(networkAction(GET, api.datasets.get(id), { meta: { id } }));
};

export const update = (id, dataset) => async (dispatch, getState) => {
    if (getState().datasets.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.datasets.update(dataset), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.datasets.list(params),
        { meta: params }
    ));
};

export const listFilter = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT, filters = {}, sortBy }, abort) => async (dispatch, getState) => {
    if(getState().datasets.isFetching && !abort)
      return

    limit = getState().pagination.pageSize;
    filters = serializeFilterParams(filters, DATASET_FILTERS)
    const ordering = serializeSortByParams(sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_FILTER,
        api.datasets.list(options, abort),
        { meta: {...options} }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const datasets = getState().datasets
    if (datasets.isFetching && !abort)
        return

    const limit = getState().pagination.pageSize;
    const filters = serializeFilterParams(datasets.filters, DATASET_FILTERS)
    const ordering = serializeSortByParams(datasets.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.datasets.list(options, abort),
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

export const setReleaseFlags = (id, releaseFlag) => async (dispatch, getState) => {
    const dataset = getState().datasets.itemsByID[id]
    if (dataset && !dataset.isFetching) {
        await dispatch(networkAction(SET_RELEASE_FLAGS, api.datasets.setReleaseFlags(id, releaseFlag),
            { meta: { id, ignoreError: 'APIError' }}));
        return await dispatch(listFiles({ id__in: dataset.files.join(",") }))
    }
};

export default {
    GET,
    UPDATE,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST,
    LIST_FILTER,
    LIST_TABLE,
    SET_RELEASE_FLAGS,
    get,
    update,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listTable,
    listFilter,
    setReleaseFlags,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

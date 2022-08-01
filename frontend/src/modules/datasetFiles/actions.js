import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {DATASET_FILE_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";
import {get as getDataset} from "../datasets/actions"

export const GET                   = createNetworkActionTypes("DATASET_FILES.GET");
export const UPDATE                = createNetworkActionTypes("DATASET_FILES.UPDATE");
export const LIST                  = createNetworkActionTypes("DATASET_FILES.LIST");
export const LIST_TABLE            = createNetworkActionTypes("DATASET_FILES.LIST_TABLE");
export const LIST_FILTER           = createNetworkActionTypes("DATASET_FILES.LIST_FILTER");
export const SET_SORT_BY           = "DATASET_FILES.SET_SORT_BY";
export const SET_FILTER            = "DATASET_FILES.SET_FILTER";
export const SET_FILTER_OPTION     = "DATASET_FILES.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "DATASET_FILES.CLEAR_FILTERS";

export const get = id => async (dispatch, getState) => {
    const datasetFile = getState().datasetFiles.itemsByID[id];
    if (datasetFile && datasetFile.isFetching)
        return;

    return await dispatch(networkAction(GET, api.datasetFiles.get(id), { meta: { id } }));
};

export const update = (id, partialDatasetFile) => async (dispatch, getState) => {
    const oldDatasetFile = getState().datasetFiles.itemsByID[id];
    if (oldDatasetFile && oldDatasetFile.isFetching)
        return;

    const datasetFile = await dispatch(networkAction(
        UPDATE, api.datasetFiles.update(partialDatasetFile), { meta: { id, ignoreError: 'APIError' }}));
    
    await dispatch(getDataset(oldDatasetFile.dataset))

    return datasetFile
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.datasetFiles.list(params),
        { meta: params }
    ));
};

export const listFilter = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT, filters = {}, sortBy }, abort) => async (dispatch, getState) => {
    if(getState().datasetFiles.isFetching && !abort)
      return

    limit = getState().pagination.pageSize;
    filters = serializeFilterParams(filters, DATASET_FILE_FILTERS)
    const ordering = serializeSortByParams(sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_FILTER,
        api.datasetFiles.list(options, abort),
        { meta: {...options} }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const datasetFiles = getState().datasetFiles
    if (datasetFiles.isFetching && !abort)
        return

    const limit = getState().pagination.pageSize;
    const filters = serializeFilterParams(datasetFiles.filters, DATASET_FILE_FILTERS)
    const ordering = serializeSortByParams(datasetFiles.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.datasetFiles.list(options, abort),
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
    GET,
    UPDATE,
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST,
    LIST_FILTER,
    LIST_TABLE,
    get,
    update,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listTable,
    listFilter,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}

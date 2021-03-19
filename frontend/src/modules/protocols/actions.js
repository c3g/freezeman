import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {PROTOCOL_FILTERS} from "../../components/filters/descriptions";
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const GET                   = createNetworkActionTypes("PROTOCOLS.GET");
export const LIST                  = createNetworkActionTypes("PROTOCOLS.LIST");
export const LIST_TABLE            = createNetworkActionTypes("PROTOCOLS.LIST_TABLE");
export const SET_SORT_BY           = "PROTOCOLS.SET_SORT_BY";
export const SET_FILTER            = "PROTOCOLS.SET_FILTER";
export const SET_FILTER_OPTION     = "PROTOCOLS.SET_FILTER_OPTION"
export const CLEAR_FILTERS         = "PROTOCOLS.CLEAR_FILTERS";

export const get = id => async (dispatch, getState) => {
    const protocol = getState().protocols.itemsByID[id];
    if (protocol && protocol.isFetching)
        return;

    return await dispatch(networkAction(GET, api.protocols.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.protocols.list(params),
        { meta: params }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
  const protocols = getState().protocols
  if (protocols.isFetching && !abort)
      return

  const filters = serializeFilterParams(protocols.filters, PROTOCOL_FILTERS)
  const ordering = serializeSortByParams(protocols.sortBy)
  const options = { limit, offset, ordering, ...filters}

  return await dispatch(networkAction(LIST_TABLE,
      api.protocols.list(options, abort),
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
    SET_SORT_BY,
    SET_FILTER,
    SET_FILTER_OPTION,
    CLEAR_FILTERS,
    LIST,
    LIST_TABLE,
    get,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listTable,
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}
import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";

import PROTOCOLS from "./actions";

export const protocols = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case PROTOCOLS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PROTOCOLS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case PROTOCOLS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true });
        case PROTOCOLS.SET_SORT_BY:
            return { ...state, sortBy: action.data };
        case PROTOCOLS.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                page: set(state.page, ['offset'], 0),
              };
        case PROTOCOLS.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                page: set(state.page, ['offset'], 0),
            };
        case PROTOCOLS.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                page: set(state.page, ['offset'], 0),
            };
        case PROTOCOLS.LIST.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case PROTOCOLS.LIST.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case PROTOCOLS.LIST.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        case PROTOCOLS.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case PROTOCOLS.LIST_TABLE.RECEIVE: {
            const totalCount = action.data.count;
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
            const results = action.data.results.map(preprocess)
            const newItemsByID = map(
                s => ({ ...s, container: s.container }), // ??
                indexByID(results)
            );
            const itemsByID = merge(state.itemsByID, [], newItemsByID);
            const itemsID = action.data.results.map(r => r.id)
            const items = mergeArray(currentItems, action.meta.offset, itemsID)
            return {
                ...state,
                itemsByID,
                items,
                totalCount,
                page: action.meta,
                isFetching: false,
                error: undefined,
            };
        }
        case PROTOCOLS.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };
  
        default:
            return state;
    }
};
        
function preprocess(protocol) {
    protocol.isFetching = false;
    protocol.isLoaded = true;
    return protocol
}

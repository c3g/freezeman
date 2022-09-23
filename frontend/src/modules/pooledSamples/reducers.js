import {merge, set} from "object-path-immutable"
import {map} from "rambda"

import {indexByID} from "../../utils/objects"
import mergeArray from "../../utils/mergeArray"

import POOLED_SAMPLES from "./actions";

export const pooledSamples = (
    state = {
        itemsByID: {},
        items: [],
        filteredItems: [],
        page: { limit: 0, offset: 0 },
        totalCount: 0,
        filteredItemsCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {
        case POOLED_SAMPLES.SET_SORT_BY:
            return { ...state, sortBy: action.data, items: [] };
        case POOLED_SAMPLES.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                items: [],
                page: set(state.page, ['offset'], 0),
            };
        case POOLED_SAMPLES.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                items: [],
                page: set(state.page, ['offset'], 0),
            }
        case POOLED_SAMPLES.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                items: [],
                page: set(state.page, ['offset'], 0),
            }

        case POOLED_SAMPLES.LIST_FILTER.REQUEST:
            return { ...state, isFetching: true, };
        case POOLED_SAMPLES.LIST_FILTER.RECEIVE: {
            const filteredItemsCount = action.data.count;
            //If filter was changed we get a new list with a different count
            const hasChanged = state.filteredItemsCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.filteredItems;
            const results = action.data.results.map(preprocess)
            //New filtered items
            const newFilteredItems = action.data.results.map(r => r.id)
            const filteredItems = mergeArray(currentItems, action.meta.offset, newFilteredItems)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return {
              ...state,
              itemsByID,
              filteredItems,
              filteredItemsCount,
              isFetching: false,
              error: undefined
            };
        }
        case POOLED_SAMPLES.LIST_FILTER.ERROR:
            return { ...state, isFetching: false, error: action.error, }

        default:
            return state;
    }
}

function preprocess(pooledSample) {
    pooledSample.isFetching = false
    pooledSample.isLoaded = true
    return pooledSample
}

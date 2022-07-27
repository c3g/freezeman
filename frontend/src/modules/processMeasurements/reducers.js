import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";

import PROCESS_MEASUREMENTS from "./actions";

export const processMeasurementsSummary = summaryReducerFactory(PROCESS_MEASUREMENTS);
export const processMeasurementTemplateActions = templateActionsReducerFactory(PROCESS_MEASUREMENTS);

export const processMeasurements = (
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

        case PROCESS_MEASUREMENTS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PROCESS_MEASUREMENTS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case PROCESS_MEASUREMENTS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case PROCESS_MEASUREMENTS.SET_SORT_BY:
            return { ...state, sortBy: action.data, items: [] };
        case PROCESS_MEASUREMENTS.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                items: [],
                page: set(state.page, ['offset'], 0),
            };
        case PROCESS_MEASUREMENTS.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                items: [],
                page: set(state.page, ['offset'], 0),
            };
        case PROCESS_MEASUREMENTS.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                items: [],
                page: set(state.page, ['offset'], 0),
            };

        case PROCESS_MEASUREMENTS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case PROCESS_MEASUREMENTS.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case PROCESS_MEASUREMENTS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case PROCESS_MEASUREMENTS.LIST_FILTER.REQUEST:
            return { ...state, isFetching: true, };
        case PROCESS_MEASUREMENTS.LIST_FILTER.RECEIVE: {
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
        case PROCESS_MEASUREMENTS.LIST_FILTER.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case PROCESS_MEASUREMENTS.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case PROCESS_MEASUREMENTS.LIST_TABLE.RECEIVE: {
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
        case PROCESS_MEASUREMENTS.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
};

function preprocess(processMeasurement) {
    processMeasurement.isFetching = false;
    processMeasurement.isLoaded = true;
    return processMeasurement
}

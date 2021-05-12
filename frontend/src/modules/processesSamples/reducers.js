import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";

import PROCESSES_SAMPLES from "./actions";

export const processesSamplesSummary = summaryReducerFactory(PROCESSES_SAMPLES);
export const processSampleTemplateActions = templateActionsReducerFactory(PROCESSES_SAMPLES);

export const processesSamples = (
    state = {
        itemsByID: {},
        items: [],
        page: { limit: 0, offset: 0 },
        totalCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {

        case PROCESSES_SAMPLES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PROCESSES_SAMPLES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case PROCESSES_SAMPLES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case PROCESSES_SAMPLES.SET_SORT_BY:
            return { ...state, sortBy: action.data };
        case PROCESSES_SAMPLES.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                page: set(state.page, ['offset'], 0),
            };
        case PROCESSES_SAMPLES.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                page: set(state.page, ['offset'], 0),
            };
        case PROCESSES_SAMPLES.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                page: set(state.page, ['offset'], 0),
            };

        case PROCESSES_SAMPLES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case PROCESSES_SAMPLES.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case PROCESSES_SAMPLES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case PROCESSES_SAMPLES.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case PROCESSES_SAMPLES.LIST_TABLE.RECEIVE: {
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
        case PROCESSES_SAMPLES.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
};

function preprocess(processSample) {
    processSample.isFetching = false;
    processSample.isLoaded = true;
    return processSample
}

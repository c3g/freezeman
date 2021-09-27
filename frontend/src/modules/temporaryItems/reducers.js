import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {preprocessSampleVersions} from "../../utils/preprocessRevisions";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";
import {resetTable} from "../../utils/reducers";

import TEMPORARY_ITEMS from "./actions";


export const temporaryItems = (
    state = {
        itemsByID: {},
        items: [],
        page: { offset: 0 },
        totalCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {
        case TEMPORARY_ITEMS.SET_SORT_BY:
            return { ...state, sortBy: action.data };
        case TEMPORARY_ITEMS.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                page: set(state.page, ['offset'], 0),
            };
        case TEMPORARY_ITEMS.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                page: set(state.page, ['offset'], 0),
            };
        case TEMPORARY_ITEMS.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                page: set(state.page, ['offset'], 0),
            };


        case TEMPORARY_ITEMS.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case TEMPORARY_ITEMS.LIST_TABLE.RECEIVE: {
            const totalCount = action.data.count;
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
            /* samples[].container stored in ../containers/reducers.js */
            const results = action.data.results.map(preprocess)
            const newItemsByID = map(
                s => ({ ...s, container: s.container }),
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
        case TEMPORARY_ITEMS.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
};

function preprocess(sample) {
    sample.isFetching = false;
    sample.isLoaded = true;
    return sample
}

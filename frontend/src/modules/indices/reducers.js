import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {preprocessSampleVersions} from "../../utils/preprocessRevisions";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";
import {resetTable} from "../../utils/reducers";

import INDICES from "./actions";

export const indicesSummary = summaryReducerFactory(INDICES);
export const indicesTemplateActions = templateActionsReducerFactory(INDICES);

export const indices = (
    state = {
        itemsByID: {},
        items: [],
        filteredItems: [],
        page: { offset: 0 },
        totalCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {

        case INDICES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case INDICES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case INDICES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case INDICES.SET_SORT_BY:
            return { ...state, sortBy: action.data };
        case INDICES.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                page: set(state.page, ['offset'], 0),
            };
        case INDICES.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                page: set(state.page, ['offset'], 0),
            };
        case INDICES.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                page: set(state.page, ['offset'], 0),
            };

        case INDICES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case INDICES.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results, "id"));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case INDICES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case INDICES.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case INDICES.LIST_TABLE.RECEIVE: {
            const totalCount = action.data.count;
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
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
        case INDICES.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };
        default:
            return state;

        case INDICES.VALIDATE.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case INDICES.VALIDATE.RECEIVE:
            return {...state, isFetching: false };
        case INDICES.VALIDATE.ERROR:
            return { ...state, error: action.error, isFetching: false };
    }
};

function preprocess(index) {
    index.isFetching = false;
    index.isLoaded = true;
    return index
}

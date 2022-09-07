import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";
import {prefillTemplatesReducerFactory} from "../../utils/prefillTemplates";

import LIBRARIES from "./actions";


export const librariesSummary = summaryReducerFactory(LIBRARIES);
export const libraryTemplateActions = templateActionsReducerFactory(LIBRARIES);
export const libraryPrefillTemplates = prefillTemplatesReducerFactory(LIBRARIES);

export const libraries = (
    state = {
        itemsByID: {},
        items: [],
        filteredItems: [],
        page: { offset: 0 },
        totalCount: 0,
        filteredItemsCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {

        case LIBRARIES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case LIBRARIES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case LIBRARIES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case LIBRARIES.SET_SORT_BY:
            return { ...state, sortBy: action.data, items: [] };
        case LIBRARIES.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            };
        case LIBRARIES.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            };
        case LIBRARIES.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            };

        case LIBRARIES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case LIBRARIES.LIST.RECEIVE: {
            /* libraries[].container stored in ../containers/reducers.js */
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case LIBRARIES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case LIBRARIES.LIST_FILTER.REQUEST:
            return { ...state, isFetching: true, };
        case LIBRARIES.LIST_FILTER.RECEIVE: {
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
        case LIBRARIES.LIST_FILTER.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case LIBRARIES.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case LIBRARIES.LIST_TABLE.RECEIVE: {
            const totalCount = action.data.count;
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
            /* libraries[].container stored in ../containers/reducers.js */
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
        case LIBRARIES.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
};

function preprocess(library) {
    library.isFetching = false;
    library.isLoaded = true;
    return library
}

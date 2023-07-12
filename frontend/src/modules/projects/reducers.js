import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {preprocessSampleVersions} from "../../utils/preprocessRevisions";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";
import {resetTable} from "../../utils/reducers";

import PROJECTS from "./actions";

export const projectsSummary = summaryReducerFactory(PROJECTS);
export const projectTemplateActions = templateActionsReducerFactory(PROJECTS);

export const projects = (
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

        case PROJECTS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PROJECTS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case PROJECTS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case PROJECTS.ADD.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case PROJECTS.ADD.RECEIVE:
            return merge(resetTable({ ...state, isFetching: false, }), ['itemsByID', action.data.id],
                preprocess(action.data));
        case PROJECTS.ADD.ERROR:
            return { ...state, error: action.error, isFetching: false };

        case PROJECTS.UPDATE.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PROJECTS.UPDATE.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined });
        case PROJECTS.UPDATE.ERROR:
            return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false });

        case PROJECTS.SET_SORT_BY:
            return { ...state, sortBy: action.data, items: [] };
        case PROJECTS.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            };
        case PROJECTS.SET_FILTER_OPTION:
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
        case PROJECTS.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            };

        case PROJECTS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case PROJECTS.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const temporaryItems = action.data.results.map(r => r.id)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, temporaryItems, isFetching: false, error: undefined };
        }
        case PROJECTS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case PROJECTS.LIST_FILTER.REQUEST:
            return { ...state, isFetching: true, };
        case PROJECTS.LIST_FILTER.RECEIVE: {
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
        case PROJECTS.LIST_FILTER.ERROR:
            return { ...state, isFetching: false, error: action.error, };


        case PROJECTS.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case PROJECTS.LIST_TABLE.RECEIVE: {
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
        case PROJECTS.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };
        default:
            return state;
    }
};

function preprocess(project) {
    project.isFetching = false;
    project.isLoaded = true;
    return project
}
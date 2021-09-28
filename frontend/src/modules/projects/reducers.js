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
        itemsBySample: [],
        itemsBySampleByID: {},
        page: { offset: 0 },
        totalCount: 0,
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
            return { ...state, sortBy: action.data };
        case PROJECTS.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
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
                page: set(state.page, ['offset'], 0),
            };
        case PROJECTS.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                page: set(state.page, ['offset'], 0),
            };

        case PROJECTS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case PROJECTS.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case PROJECTS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case PROJECTS.LIST_BY_SAMPLE.REQUEST:
            return { ...state, isFetching: true, };
        case PROJECTS.LIST_BY_SAMPLE.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsBySampleByID = indexByID(results);
            const itemsBySample = action.data.results.map(r => r.id)
            return {
              ...state,
              itemsBySample,
              itemsBySampleByID,
              isFetching: false,
              error: undefined
            };
        }
        case PROJECTS.LIST_BY_SAMPLE.ERROR:
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

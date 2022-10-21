import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {preprocessSampleVersions} from "../../utils/preprocessRevisions";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";
import {prefillTemplatesReducerFactory} from "../../utils/prefillTemplates";
import {resetTable} from "../../utils/reducers";

import SAMPLES from "./actions";

export const sampleKinds = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case SAMPLES.LIST_KINDS.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case SAMPLES.LIST_KINDS.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case SAMPLES.LIST_KINDS.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};

export const samplesSummary = summaryReducerFactory(SAMPLES);
export const sampleTemplateActions = templateActionsReducerFactory(SAMPLES);
export const samplePrefillTemplates = prefillTemplatesReducerFactory(SAMPLES);

export const samples = (
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

        case SAMPLES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case SAMPLES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case SAMPLES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case SAMPLES.ADD.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case SAMPLES.ADD.RECEIVE:
            return merge(resetTable({ ...state, isFetching: false, }), ['itemsByID', action.data.id],
                preprocess(action.data));
        case SAMPLES.ADD.ERROR:
            return { ...state, error: action.error, isFetching: false };

        case SAMPLES.UPDATE.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case SAMPLES.UPDATE.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined });
        case SAMPLES.UPDATE.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
                { error: action.error, isFetching: false });

        case SAMPLES.SET_SORT_BY:
            return { ...state, sortBy: action.data, items: [] };
        case SAMPLES.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            };
        case SAMPLES.SET_FILTER_OPTION:
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
        case SAMPLES.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            };

        case SAMPLES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case SAMPLES.LIST.RECEIVE: {
            /* samples[].container stored in ../containers/reducers.js */
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case SAMPLES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case SAMPLES.LIST_FILTER.REQUEST:
            return { ...state, isFetching: true, };
        case SAMPLES.LIST_FILTER.RECEIVE: {
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
        case SAMPLES.LIST_FILTER.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case SAMPLES.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case SAMPLES.LIST_TABLE.RECEIVE: {
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
        case SAMPLES.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case SAMPLES.LIST_VERSIONS.REQUEST:
            return set(state, ['itemsByID', action.meta.id, 'isFetching'], true);
        case SAMPLES.LIST_VERSIONS.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], {
                isFetching: false,
                versions: preprocessSampleVersions(action.data),
            });
        case SAMPLES.LIST_VERSIONS.ERROR:
            return merge(state, ['itemsByID', action.meta.id], {
                isFetching: false,
                versions: [],
                error: action.error,
            });

        default:
            return state;
    }
};

function preprocess(sample) {
    sample.isFetching = false;
    sample.isLoaded = true;
    return sample
}

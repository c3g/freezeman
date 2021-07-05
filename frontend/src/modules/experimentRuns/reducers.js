import {merge, set} from "object-path-immutable";

import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import EXPERIMENT_RUNS from "./actions";
import {map} from "rambda";


// TODO: template and summary

export const experimentTypes = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case EXPERIMENT_RUNS.LIST_TYPES.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case EXPERIMENT_RUNS.LIST_TYPES.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case EXPERIMENT_RUNS.LIST_TYPES.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};

export const instruments = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case EXPERIMENT_RUNS.LIST_INSTRUMENTS.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case EXPERIMENT_RUNS.LIST_INSTRUMENTS.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case EXPERIMENT_RUNS.LIST_INSTRUMENTS.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};

export const processes = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case EXPERIMENT_RUNS.LIST_PROCESSES.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case EXPERIMENT_RUNS.LIST_PROCESSES.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case EXPERIMENT_RUNS.LIST_PROCESSES.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};



export const experimentRuns = (
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

        case EXPERIMENT_RUNS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case EXPERIMENT_RUNS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case EXPERIMENT_RUNS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case EXPERIMENT_RUNS.SET_SORT_BY:
            return { ...state, sortBy: action.data };
        case EXPERIMENT_RUNS.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                page: set(state.page, ['offset'], 0),
            };
        case EXPERIMENT_RUNS.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                page: set(state.page, ['offset'], 0),
            };
        case EXPERIMENT_RUNS.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                page: set(state.page, ['offset'], 0),
            };

        case EXPERIMENT_RUNS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case EXPERIMENT_RUNS.LIST.RECEIVE: {
            const results = action.data
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case EXPERIMENT_RUNS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case EXPERIMENT_RUNS.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case EXPERIMENT_RUNS.LIST_TABLE.RECEIVE: {
            const totalCount = action.data.length;
            const hasChanged = state.totalCount !== action.data.length;
            const currentItems = hasChanged ? [] : state.items;

            const results = action.data
            const newItemsByID = map(
                s => ({ ...s, container: s.container }), // ??
                indexByID(results)
            );
            const itemsByID = merge(state.itemsByID, [], newItemsByID);
            const itemsID = action.data.map(r => r.id)
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
        case EXPERIMENT_RUNS.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
};
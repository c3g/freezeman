import {merge, set} from "object-path-immutable";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";
import {resetTable} from "../../utils/reducers";

import CONTAINERS from "./actions";
import SAMPLES from "../samples/actions";

export const containerKinds = (
  state = {
    items: [],
    itemsByID: {},
    isFetching: false,
  },
  action
) => {
  switch (action.type) {
    case CONTAINERS.LIST_KINDS.REQUEST:
      return {
        ...state,
        isFetching: true,
      };
    case CONTAINERS.LIST_KINDS.RECEIVE:
      return {
        ...state,
        items: action.data,
        itemsByID: indexByID(action.data, "id"),
        isFetching: false,
      };
    case CONTAINERS.LIST_KINDS.ERROR:
      return {
        ...state,
        isFetching: false,
        error: action.error,
      };
    default:
      return state;
  }
};

export const containersSummary = summaryReducerFactory(CONTAINERS);
export const containerTemplateActions = templateActionsReducerFactory(CONTAINERS);

export const containers = (
  state = {
    itemsByID: {},
    items: [],
    page: { limit: 0, offset: 0 },
    totalCount: 0,
    isFetching: false,
    error: undefined,
    filters: {},
    sortBy: { key: undefined, order: undefined },
  },
  action
) => {
  switch (action.type) {
    case CONTAINERS.GET.REQUEST:
      return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
    case CONTAINERS.GET.RECEIVE:
      return merge(state, ['itemsByID', action.meta.id],
        { ...preprocess(action.data), isFetching: false });
    case CONTAINERS.GET.ERROR:
      return merge(state, ['itemsByID', action.meta.id],
        { error: action.error, isFetching: false, didFail: true });

    case CONTAINERS.ADD.REQUEST:
      return { ...state, error: undefined, isFetching: true };
    case CONTAINERS.ADD.RECEIVE:
      return merge(resetTable({ ...state, isFetching: false, }), ['itemsByID', action.data.id],
        { ...preprocess(action.data) });
    case CONTAINERS.ADD.ERROR:
      return { ...state, error: action.error, isFetching: false };

    case CONTAINERS.UPDATE.REQUEST:
      return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
    case CONTAINERS.UPDATE.RECEIVE:
      return merge(state, ['itemsByID', action.meta.id], { ...preprocess(action.data), isFetching: false, versions: undefined });
    case CONTAINERS.UPDATE.ERROR:
      return merge(state, ['itemsByID', action.meta.id],
        { error: action.error, isFetching: false });

    case CONTAINERS.SET_SORT_BY:
      return { ...state, sortBy: action.data };
    case CONTAINERS.SET_FILTER:
      return {
        ...state,
        filters: set(state.filters, [action.data.name, 'value'], action.data.value),
        page: set(state.page, ['offset'], 0),
      };
    case CONTAINERS.SET_FILTER_OPTION:
      return {
        ...state,
        filters: set(
          state.filters,
          [action.data.name, 'options', action.data.option],
          action.data.value
        ),
        page: set(state.page, ['offset'], 0),
      };
    case CONTAINERS.CLEAR_FILTERS:
      return {
        ...state,
        filters: {},
        page: set(state.page, ['offset'], 0),
      };

    case CONTAINERS.LIST.REQUEST:
      return { ...state, isFetching: true };
    case CONTAINERS.LIST.RECEIVE: {
      const results = action.data.results.map(preprocess)
      const itemsByID = merge(state.itemsByID, [], indexByID(results, "id"));
      return { ...state, itemsByID, isFetching: false, error: undefined };
    }
    case CONTAINERS.LIST.ERROR:
      return { ...state, isFetching: false, error: action.error };

    case CONTAINERS.LIST_TABLE.REQUEST:
      return { ...state, isFetching: true };
    case CONTAINERS.LIST_TABLE.RECEIVE: {
      const totalCount = action.data.count;
      const hasChanged = state.totalCount !== action.data.count;
      const currentItems = hasChanged ? [] : state.items;
      const results = action.data.results.map(preprocess)
      const itemsByID = merge(state.itemsByID, [], indexByID(results, "id"));
      const itemsID = results.map(r => r.id)
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
    case CONTAINERS.LIST_TABLE.ERROR:
      return { ...state, isFetching: false, error: action.error };

    /* Normalize samples[].container */
    case SAMPLES.LIST.RECEIVE:
    case SAMPLES.LIST_TABLE.RECEIVE: {
      const samples = action.data.results;
      const containers = samples.map(s => s.container).filter(Boolean)
      const itemsByID = merge(state.itemsByID, [], indexByID(containers, "id"));
      return { ...state, itemsByID };
    }

    case CONTAINERS.LIST_PARENTS.REQUEST:
      return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
    case CONTAINERS.LIST_PARENTS.RECEIVE: {
      const parents = action.data.map(preprocess);
      const parentsID = parents.map(p => p.id);
      const itemsByID = merge(state.itemsByID, [], indexByID(parents))
      return merge(state, ['itemsByID'],
        merge(itemsByID, [action.meta.id], { isFetching: false, parents: parentsID })
      );
    }
    case CONTAINERS.LIST_PARENTS.ERROR:
      return merge(state, ['itemsByID', action.meta.id],
        { error: action.error, isFetching: false, didFail: true });

    case CONTAINERS.LIST_CHILDREN.REQUEST: {
      const container = state.itemsByID[action.meta.id];
      const itemsByID = indexByID(
        container.children
          .filter(id => !action.meta.excludes.includes(id))
          .map(id => ({ id, isFetching: true })))
      itemsByID[action.meta.id] = set(container, ['isFetching'], true);
      return merge(state, ['itemsByID'], itemsByID);
    }
    case CONTAINERS.LIST_CHILDREN.RECEIVE: {
      const container = state.itemsByID[action.meta.id];
      const items = action.data.map(preprocess);
      const itemsByID = merge(state.itemsByID, [], indexByID(items))
      itemsByID[action.meta.id] = set(container, ['isFetching'], false);
      return merge(state, ['itemsByID'], itemsByID);
    }
    case CONTAINERS.LIST_CHILDREN.ERROR:
      return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true });

    /*
     * NOTE: CONTAINERS.LIST_SAMPLES is handled in samples & containers
     */
    case CONTAINERS.LIST_SAMPLES.REQUEST:
      return merge(state, ['itemsByID', action.meta.id], { isFetching: true });
    case CONTAINERS.LIST_SAMPLES.RECEIVE:
      return merge(state, ['itemsByID', action.meta.id], { isFetching: false });
    case CONTAINERS.LIST_SAMPLES.ERROR:
      return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false });

    default:
      return state;
  }
};

function preprocess(container) {
  container.isFetching = false
  container.isLoaded = true
  return container;
}

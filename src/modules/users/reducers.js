import {merge, set} from "object-path-immutable";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";

import preprocessVersions from "../../utils/preprocessVersions";
import USERS from "./actions";

export const users = (
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
    case USERS.SET_SORT_BY:
      return { ...state, sortBy: action.data };
    case USERS.SET_FILTER:
      return {
        ...state,
        filters: set(state.filters, [action.data.name, 'value'], action.data.value),
        page: set(state.page, ['offset'], 0),
      };
    case USERS.SET_FILTER_OPTION:
      return {
        ...state,
        filters: set(state.filters, [action.data.name, 'options'], action.data.options),
        page: set(state.page, ['offset'], 0),
      };
    case USERS.CLEAR_FILTERS:
      return {
        ...state,
        filters: {},
        page: set(state.page, ['offset'], 0),
      };

    case USERS.LIST.REQUEST:
      return { ...state, isFetching: true };
    case USERS.LIST.RECEIVE: {
      const results = action.data.results.map(preprocess)
      const itemsByID = merge(state.itemsByID, [], indexByID(results, "id"));
      return {
        ...state,
        itemsByID,
        isFetching: false,
        error: undefined,
      };
    }
    case USERS.LIST.ERROR:
      return { ...state, isFetching: false, error: action.error };

    case USERS.LIST_TABLE.REQUEST:
      return { ...state, isFetching: true };
    case USERS.LIST_TABLE.RECEIVE: {
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
    case USERS.LIST_TABLE.ERROR:
      return { ...state, isFetching: false, error: action.error };

    case USERS.LIST_VERSIONS.REQUEST:
      return set(state, ['itemsByID', action.meta.id, 'isFetching'], true);
    case USERS.LIST_VERSIONS.RECEIVE:
      return merge(state, ['itemsByID', action.meta.id], {
        isFetching: false,
        versions: preprocessVersions(action.data.results),
      });
    case USERS.LIST_VERSIONS.ERROR:
      return merge(state, ['itemsByID', action.meta.id], {
        isFetching: false,
        versions: [],
        error: action.error,
      });

    default:
      return state;
  }
};

function preprocess(user) {
  return user
}

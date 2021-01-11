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
        filters: set(state.filters, [action.data.name], action.data.value),
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
      const hasChanged = state.totalCount !== action.data.count;
      const currentItems = hasChanged ? [] : state.items;
      const results = action.data.results.map(preprocessUser)
      const itemsByID = merge(state.itemsByID, [], indexByID(results, "id"));
      const itemsID = results.map(r => r.id)
      const items = mergeArray(currentItems, action.meta.offset, itemsID)
      return {
        ...state,
        itemsByID,
        items,
        totalCount: action.data.count,
        page: action.meta,
        isFetching: false,
      };
    }
    case USERS.LIST.ERROR:
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

function preprocessUser(user) {
  return user
}

import {merge, set} from "object-path-immutable";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";

import shouldIgnoreError from "../../utils/shouldIgnoreError";
import {preprocessUserActionVersions, preprocessUserActionRevisions} from "../../utils/preprocessRevisions";
import {resetTable} from "../../utils/reducers";
import USERS from "./actions";

export const users = (
  state = {
    itemsByID: {},
    items: [],
    page: { offset: 0 },
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
      return { ...state, sortBy: action.data, items: [] };
    case USERS.SET_FILTER:
      return {
        ...state,
        filters: set(state.filters, [action.data.name, 'value'], action.data.value),
        items: [],
        totalCount: 0,
        page: set(state.page, ['offset'], 0),
      };
    case USERS.SET_FILTER_OPTION:
      return {
        ...state,
        filters: set(state.filters, [action.data.name, 'options'], action.data.options),
        items: [],
        totalCount: 0,
        page: set(state.page, ['offset'], 0),
      };
    case USERS.CLEAR_FILTERS:
      return {
        ...state,
        filters: {},
        items: [],
        totalCount: 0,
        page: set(state.page, ['offset'], 0),
      };

    case USERS.GET.REQUEST:
        return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
    case USERS.GET.RECEIVE:
        return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
    case USERS.GET.ERROR:
        return merge(state, ['itemsByID', action.meta.id],
          { error: action.error, isFetching: false, didFail: true });

    case USERS.ADD.REQUEST:
        return { ...state, error: undefined, isFetching: true };
    case USERS.ADD.RECEIVE:
        return merge(resetTable({ ...state, error: undefined, isFetching: false, }),
          ['itemsByID', action.data.id],
          preprocess(action.data));
    case USERS.ADD.ERROR:
        return { ...state, error: action.error, isFetching: false };

    case USERS.UPDATE.REQUEST:
        return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
    case USERS.UPDATE.RECEIVE:
        return merge(state, ['itemsByID', action.meta.id], { ...action.data, error: undefined, isFetching: false, versions: undefined });
    case USERS.UPDATE.ERROR:
        return merge(state, ['itemsByID', action.meta.id],
            { error: action.error, isFetching: false });

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
      return { ...state, isFetching: false, error: shouldIgnoreError(action) ? undefined : action.error };

    case USERS.LIST_REVISIONS.REQUEST:
      return set(state, ['itemsByID', action.meta.id, 'revisions', 'isFetching'], true);
    case USERS.LIST_REVISIONS.RECEIVE:
      return merge(state, ['itemsByID', action.meta.id], {
        revisions: preprocessUserActionRevisions(
          state.itemsByID[action.meta.id].revisions,
          action.data
        ),
      });
    case USERS.LIST_REVISIONS.ERROR:
      return merge(state, ['itemsByID', action.meta.id], {
        revisions: { isFetching: false },
        error: action.error,
      });

    case USERS.LIST_VERSIONS.REQUEST:
      return set(state, ['itemsByID', action.meta.id, 'versions', 'isFetching'], true);
    case USERS.LIST_VERSIONS.RECEIVE:
      return merge(state, ['itemsByID', action.meta.id], {
        versions: preprocessUserActionVersions(
          state.itemsByID[action.meta.id].versions,
          action.data
        ),
      });
    case USERS.LIST_VERSIONS.ERROR:
      return merge(state, ['itemsByID', action.meta.id], {
        versions: { isFetching: false },
        error: action.error,
      });

    default:
      return state;
  }
};

function preprocess(user) {
  delete user.password
  user.isFetching = false
  return user
}
